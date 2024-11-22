import jwt_decode from "jwt-decode";

export const getTokenExpirationDate = (token) => {
  try {
    const decoded = jwt_decode(token);
    if (decoded.exp === undefined) return null;

    const date = new Date(0);
    date.setUTCSeconds(decoded.exp);
    return date;
  } catch (e) {
    return null;
  }
};

export const isTokenExpired = (token) => {
  const expirationDate = getTokenExpirationDate(token);
  if (expirationDate === null) return false;
  return expirationDate < new Date();
};
