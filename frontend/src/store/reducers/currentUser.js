import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import API from '../../api';

const PROFILE_PIC_BASE_URL = `https:randomuser.me/portraits`;

const getUserById = createAsyncThunk('/currentUser/getById', async (userId) => {
  const user = await API.getUserById(userId);
  let photos = await API.getUserPhotos(userId);
  const hates = await Promise.all(user.hates.map(hateId => API.getHateById(hateId)));

  if (userId < 102) {
    const sex = user.user_sex === 'male' ? 'men' : 'women';
    photos = { photo1: { public_id: `${userId}/photo1`, image_url: `${PROFILE_PIC_BASE_URL}/${sex}/${userId}` } };
  }
  return { user, photos, hates }
});


export const currentUser = createSlice({
  name: 'currentUser',
  initialState: {
    status: 'idle',
    editable: false,
    likes: null,
    user: {
      id: 3, 
      first_name: 'Rachel',
      birthday: '2000-03-23',
      user_sex: 'female',
      sex_preference: 'male',
      photos: {},
      prompts: {},
      hates: []
    }
  },
  reducers: {
    setStatus: (state, action) => {
      state.status = action.payload;
    },
    setEditPermissions: (state, action) => {
      state.editable = action.payload;
    },
    setLikes: (state, action) => {
      state.likes = action.payload;
    }
  },
  extraReducers(builder) {
    builder.addCase(getUserById.pending, (state, action) => {
      state.status = 'pending';
    });
    builder.addCase(getUserById.fulfilled, (state, action) => {
      const { user, photos, hates } = action.payload;
      state.user = {...state.user, ...user, photos, hates}
      state.status = 'success'; 
    });
  }
});

export { getUserById }
export default currentUser.reducer;
export const { setStatus, setEditPermissions, setLikes } = currentUser.actions;