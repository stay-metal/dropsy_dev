// actions/authActions.js
import axios from "axios";
import { LOGIN_SUCCESS, LOGIN_FAIL, LOGOUT } from "./actionTypes";

export const login = (username, password) => async (dispatch) => {
  try {
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/login`, {
      username,
      password,
    });

    const token = response.data.token;

    // Save token to localStorage
    localStorage.setItem("token", token);

    dispatch({
      type: LOGIN_SUCCESS,
      payload: token,
    });
  } catch (error) {
    dispatch({
      type: LOGIN_FAIL,
    });
    throw error;
  }
};

export const logout = () => (dispatch) => {
  localStorage.removeItem("token");
  dispatch({
    type: LOGOUT,
  });
};
