
function State() {
  let states = {
    starting: "Starting",
    started: "Started",
    stopped: "Stopped",
  };
  let currentState = states.stopped;

  return {
    ChangeState: (newState) => {
      currentState = newState;
    },
    CurrentState: () => {
      return currentState;
    },
    GetStates: () => {
      return states;
    },
  };
}
module.exports = State;