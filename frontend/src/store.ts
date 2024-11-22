import { createStore, applyMiddleware, combineReducers } from "redux";

import filesReducer from "./reducers/filesReducer";
import authReducer from "./reducers/authReducer";

import { thunk } from "redux-thunk";

const rootReducer = combineReducers({
  files: filesReducer,
  auth: authReducer,
});

const store = createStore(rootReducer, undefined, applyMiddleware(thunk));

export default store;
