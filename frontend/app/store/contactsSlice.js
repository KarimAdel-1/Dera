import { createSlice } from '@reduxjs/toolkit';

const contactsSlice = createSlice({
  name: 'contacts',
  initialState: {
    contacts: []
  },
  reducers: {
    addContact: (state, action) => {
      state.contacts.push({
        id: Date.now(),
        name: action.payload.name,
        walletAddress: action.payload.walletAddress
      });
    },
    removeContact: (state, action) => {
      state.contacts = state.contacts.filter(contact => contact.id !== action.payload);
    }
  }
});

export const { addContact, removeContact } = contactsSlice.actions;
export default contactsSlice.reducer;
