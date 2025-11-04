// ErrorCodes.ts
type ErrorCodes = {
  [key: string]: {
    [key: string]: string | ((errorObj: any) => string);
  };
};

type ErrorCodeKeys = {
  [key: string]: Array<string>;
};

const ErrorCodes: ErrorCodes = Object.freeze({
  "400": {
    InvalidParam: "Invalid Param passed!",
    InvalidOperation: "INVALID_OPERATION",
    UserIsBusy: "The user is already busy in another channel",
  },
  "401": {
    MessageTooLarge: "The message is too large",
  },
  "403": {
  },
  "404": {
    NotificationNotFound: "The Notification was not found in the data!",
  },
  "423": {

  },
  "424": {
    UserLowOnBalance: "Your balance is too low to join the channel",
  },
  "500": {
  },
});

const ErrorCodeKeys: ErrorCodeKeys = Object.keys(ErrorCodes).reduce(
  (obj: ErrorCodeKeys, k: string) => {
    obj[k] = Object.keys(ErrorCodes[k]);
    return obj;
  },
  {}
);

export { ErrorCodes, ErrorCodeKeys };