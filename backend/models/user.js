// const bcrypt = require('bcrypt');
// const db = require('../db.js');
// const ExpressError = require('../helpers/expressError.js');
// const { BCRYPT_WORK_FACTOR } = require("../config.js");

import bcrypt from 'bcrypt';
import db from '../db.js';
import ExpressError from '../helpers/expressError.js';
import { BCRYPT_WORK_FACTOR } from "../config.js";
import format from 'pg-format';

class User {

    static async register({ username, pw, first_name, birthday, user_sex, sex_preference }) {
        const duplicateCheck = await db.query(`SELECT username FROM users WHERE username=$1`, [username]);

        if (duplicateCheck.rows[0]) {
            throw new ExpressError(`Account registered with username ${username}`, 400);
        }

        const hashedPassword = await bcrypt.hash(pw, BCRYPT_WORK_FACTOR);
        console.log(typeof birthday)
        const result = await db.query(`INSERT INTO users
                                            (username, pw, first_name, birthday, user_sex, sex_preference)
                                        VALUES 
                                            ($1, $2, $3, $4, $5, $6)
                                        RETURNING id, username, first_name, birthday, user_sex, sex_preference`, 
                                        [username, 
                                        hashedPassword,
                                        first_name,
                                        birthday,
                                        user_sex,
                                        sex_preference ]);
        
        return result.rows[0];          
    }

    static async login({ username, pw }){
        const checkUser = await db.query(`SELECT 
                                            id,
                                            username,
                                            pw,
                                            first_name,
                                            birthday,
                                            user_sex,
                                            sex_preference
                                        FROM users WHERE username=$1`, [username]);

        const user = checkUser.rows[0];
        console.log(user);

        if (!user) {
            throw new ExpressError(`User with username ${username} does not exist`, 403);
        }

        if (user && (await bcrypt.compare(pw, user.pw))) {
            delete user.pw;
            return user;
        } else {
            throw new ExpressError('Incorrect password', 401);
        }
    }

    static async getUserById(userId) {
        const result = await db.query(`SELECT 
                                        id,
                                        first_name,
                                        birthday,
                                        user_sex,
                                        sex_preference,
                                        bio,
                                        prompt1,
                                        prompt2,
                                        prompt3,
                                        prompt1_res,
                                        prompt2_res,
                                        prompt3_res,
                                        hate1,
                                        hate2,
                                        hate3,
                                        hate4,
                                        hate5
                                    FROM 
                                        users
                                    WHERE id = $1`, [userId]);
        const data = result.rows[0];
        const { id, first_name, birthday, user_sex, sex_preference, bio } = data;
        const prompts = {}
        for (let i = 1; i <=3; i++) {
            const key = `prompt${i}`;
            prompts[key] = {
                name: key,
                id: data[key],
                promptRes: data[`${key}_res`]
            }
        }
        const hates = [data.hate1, data.hate2, data.hate3, data.hate4, data.hate5].filter((val) => val !== null);
        return { id, first_name, birthday, user_sex, sex_preference, bio, prompts, hates }
    }

    // Selects matched users for given userId
    // int: userId -> [match, ...]

    static async queryMatches(userId) {
        const result = await db.query(`WITH matchedUsers AS
                                    (SELECT
                                        id, 
                                        CASE 
                                            WHEN user1_id = $1 THEN user2_id
                                            ELSE user1_id 
                                        END AS user_id
                                    FROM 
                                        matches
                                    WHERE 
                                        $1 IN (user1_id, user2_id))

                                    SELECT
                                        matchedUsers.id AS match_id,
                                        users.*
                                    FROM 
                                        matchedUsers
                                    JOIN 
                                        users 
                                    ON users.id = matchedUsers.user_id;
                                    `,[userId])
        
        return result.rows.reduce((acc, match) => {
            const { match_id, ...user } = match;
            acc[match_id] = user;
            return acc;
        }, {});
    }

    static async queryUserIds({ userId, offset=0 }) {
        const result = await db.query(`SELECT u2.id, u1.sex_preference, u2.user_sex FROM 
                                        users u1
                                    JOIN 
                                        users u2 
                                    ON 
                                        u1.user_sex = u2.sex_preference
                                    AND
                                        u1.sex_preference = u2.user_sex
                                    WHERE 
                                        ($1, u2.id) NOT IN (SELECT * FROM likes)
                                    AND 
                                        ($1, u2.id) NOT IN (SELECT * FROM dislikes)
                                    AND 
                                        ($1, u2.id) NOT IN (SELECT user1_id, user2_id FROM matches)
                                    AND 
                                        u1.id = $1
                                    AND 
                                        u2.id <> $1
                                    LIMIT 10 OFFSET $2`, [userId, offset]);
        return result.rows.map(user => user.id);
    }

    static async getPhotoById(publicId) {
        const result = await db.query(`SELECT 
                                        public_id, image_url 
                                    FROM 
                                        photos
                                    WHERE 
                                        public_id = $1`, [publicId]);
        return result.rows[0];
    }

    static async getUserPhotos(userId) {
        const result = await db.query(`SELECT 
                                        public_id, image_url 
                                    FROM 
                                        photos
                                    WHERE 
                                        user_id = $1
                                    ORDER BY 
                                        public_id`, [userId]);
        return result.rows.reduce((acc, value, i) => {
         return ({...acc, [`photo${i+1}`]: value })   
        }, {});
    }

    static async addPhoto({ userId, publicId, imageUrl }) {
        const result = await db.query(`INSERT INTO photos
                                        (user_id, public_id, image_url)
                                    VALUES
                                        ($1, $2, $3)
                                    RETURNING user_id, public_id, image_url`, [userId, publicId, imageUrl]);
        return result.rows[0];
    }

    static async updatePhoto({ publicId, imageUrl }) {
        const result = await db.query(`UPDATE 
                                        photos 
                                    SET 
                                        image_url = $1 
                                    WHERE 
                                        public_id = $2
                                    RETURNING 
                                        public_id, image_url`, [imageUrl, publicId]);
        return result.rows[0];
    }

    static async addBio({ bio, userId }) {
        const result = await db.query(`UPDATE users
                                    SET bio = $1 
                                    WHERE id = $2
                                    RETURNING bio`, [bio, userId]);
        return result.rows[0].bio;
    }

    static async addPrompt(prompt, userId) {
        const { name, id = null, promptRes=null } = prompt;
        const result = await db.query(`UPDATE users
                        SET ${name} = $1,
                            ${name}_res = $2
                        WHERE id = $3
                        RETURNING ${name} AS id, ${name}_res AS promptRes`, [id, promptRes, userId]);
        return result.rows[0];
    }

    static async addHates([ hate1=null, hate2=null, hate3=null, hate4=null, hate5=null,], userId) {
        const res = await db.query(`UPDATE users 
                                        SET
                                            hate1=$1, 
                                            hate2=$2, 
                                            hate3=$3, 
                                            hate4=$4,
                                            hate5=$5
                                        WHERE 
                                            id = $6
                                        RETURNING
                                            hate1,
                                            hate2,
                                            hate3,
                                            hate4,
                                            hate5`, [hate1, hate2, hate3, hate4, hate5, userId]);
        
        return res.rows[0];
      }    
}

export default User;