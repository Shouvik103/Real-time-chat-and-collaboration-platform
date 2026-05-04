const { create } = require('zustand');
const { createStore } = require('zustand/vanilla');

const store = createStore((set) => ({
  messages: {
    'channel1': [
      { id: '1', content: 'hello' }
    ]
  },
  updateMessage: (message) =>
    set((state) => {
      const existing = state.messages[message.channelId] ?? [];
      return {
        messages: {
          ...state.messages,
          [message.channelId]: existing.map((m) =>
            m.id === message.id ? message : m,
          ),
        },
      };
    }),
}));

console.log("Before:", store.getState().messages['channel1']);
store.getState().updateMessage({ id: '1', channelId: 'channel1', content: 'world' });
console.log("After:", store.getState().messages['channel1']);
