let state = {
  spaces: {},
  users: {}
};

export function useState() {
  function set(newState) {
    state = newState;
  }

  function get() {
    return state;
  }

  return { set, get };
}
