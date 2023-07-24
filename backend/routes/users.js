import User from '../models/user.js';
import Message from '../models/message.js';
import express, { Router } from 'express';
import ExpressError from '../helpers/expressError.js';
import { authenticateJWT, ensureLoggedIn, isUser, isAdmin } from '../middleware/auth.js';

const router = new Router();

router.get('/:userId', async function (req, res, next) {
    const { userId } = req.params;
    try {
        let user = await User.getUserById(userId);
        return res.json(user);
    } catch (error) {
        next(error);
    }
});

// router.get('/:userId/users', ensureLoggedIn, async function(req, res, next) {
//     const { userId } = req.params;
//     const { offset } = req.body;
//     try {
//         let userIds = await User.queryUserIds({ userId, offset });
//         return res.json(userIds);
//     } catch (error) {
//         next(error);
//     }
// });


// router.get('/:userId/photos', isUser, async function(req, res, next) {
//     const { userId } = req.params;
//     try {
//         let photos = await User.getUserPhotos(userId);
//         return res.json(photos);
//     } catch (error) {
//         next(error);
//     }
// });

router.delete('/:userId/photo', [authenticateJWT, ensureLoggedIn, isUser], async function(req, res, next) {
    const { public_id } = req.body;
    try {
        const result = await User.deletePhoto(public_id);
        return res.json({ message: `Deleted photo with public id ${result.public_id}`});
    } catch (error) {
        next(error);
    }
})

router.get('/:userId/matches', [ authenticateJWT, ensureLoggedIn, isUser], async function(req, res, next) {
    try {
        const { userId } = req.params;
        let matches = await User.queryMatches(userId);
        return res.json({ matches });
    } catch (error) {
        next(error);
    }
});

router.post('/:userId/bio', [ authenticateJWT, ensureLoggedIn, isUser, isAdmin], async function (req, res, next) {
    try {
        const { bioData } = req.body;
        const { userId } = req.params;
        const bio = await User.addBio(bioData, userId);
        console.log(bio);
        return res.status(201).json({ bio });
    } catch (error) {
        next(error);
    }
});

router.post('/:userId/hates', async function(req, res, next) {
    try {
        const { userId } = req.params;
        const hates = JSON.parse(req.body.hates);
        const result = await User.addHates(hates, userId);
        return res.status(201).json(result);
    } catch (error) {
        next(error);    
    }
});  

router.post('/:userId/prompts', async function (req, res, next) {
    try {
        const { prompts } = req.body;
        const { userId } = req.params;
        const result = await Promise.all(Object.values(prompts).map(prompt => (
            User.addPrompt(prompt, userId)
        )));
        
        const res_obj = result.reduce((acc, prompt, i) => {
            console.log(prompt);
            return ({...acc, [`prompt${i+1}`]: { name: `prompt${i+1}`, id: prompt.id, promptRes: prompt.promptres}});
        }, {});
        return res.status(201).json(res_obj);
    } catch (error) {
        next(error);
    }
});

router.get(`/:userId/notifications`, async function (req, res, next) {
    try {
        const { userId } = req.params;
        const notifications = await Message.matchNotifications(userId);
        return res.json(notifications);
    } catch (error) {
        next(error);
    }
}) 

export default router;