const {
  BAD_REQUEST,
  OK,
  SERVER_ERROR,
  NOT_FOUND,
} = require("../constants/constants");
const generatePassword = require("generate-password");
const { readFileSync } = require("fs");
const {
  EMAIL_EMPTY,
  PASSWORD_EMPTY,
  INCORRECT_EMAIL_PASSWORD,
  LOGIN_SUCCESS,
  NEW_PASSWORD_EMPTY,
  CONFIRM_PASSWORD_EMPTY,
  NEW_AND_CONFIRM_NOT_MATCHED,
  SOMETHING_WENT_WRONG,
  USER_NOT_FOUND,
  PASSWORD_RESET_SUCCESS,
  OLD_PASSWORD_EMPTY,
  INCORRECT_OLD_PASSWORD,
  LOGOUT_SUCCESS,
  PASSWORD_CHANGED_SUCCESS,
  CODE_EMPTY,
  CODE_EXPIRED,
  CODE_NOT_MATCHED,
} = require("../constants/messages");
const {
  makeResponse,
  compareHash,
  generateToken,
  generateHash,
  sendMail,
} = require("../helpers/general");
const { fetch, store, remove } = require("../helpers/DBHandler");

module.exports.login = async (req, res) => {
  let { email, password } = req.body;

  if (!email) return makeResponse(res, EMAIL_EMPTY, BAD_REQUEST);
  if (!password) return makeResponse(res, PASSWORD_EMPTY, BAD_REQUEST);

  let existingUsers = await fetch(`/users`);
  let user = null;
  if (existingUsers) {
    user = Object.values(existingUsers).find((user) => user.email === email);
  }

  if (user) {
    if (await compareHash(password, user.password)) {
      await store(`/users/${user?.userID}/status`, "Online");
      let profile = user;
      delete profile?.password;
      let token = generateToken(profile);
      if (user.isVerified) {
        return makeResponse(res, LOGIN_SUCCESS, OK, { profile, token });
      } else {
        let template = readFileSync(
          "./helpers/verification-code-template.html",
          "utf8"
        );
        let code = Math.ceil(Math.random() * 1000000);
        if (code.toString().length < 6) {
          code *= 10;
        }
        template = template.replace("{{verificationCode}}", code);
        let response = await sendMail(
          email,
          "Verification code from TableTech",
          template
        );
        if (response) {
          await store(`/users/${user?.userID}/verificationCode`, code);
          await store(`/users/${user?.userID}/verificationTime`, Date.now());
          return makeResponse(
            res,
            "Verification code sent on the given Email",
            OK,
            { profile, token }
          );
        }
        return makeResponse(res, SOMETHING_WENT_WRONG, SERVER_ERROR);
      }
    }
  }
  return makeResponse(res, INCORRECT_EMAIL_PASSWORD, BAD_REQUEST);
};

module.exports.sendCode = async (req, res) => {
  let email = req.body?.email;

  if (!email) return makeResponse(res, EMAIL_EMPTY, BAD_REQUEST);

  let allUsers = await fetch(`/users/`);
  if (allUsers) {
    let user = Object.values(allUsers).find((user, _) => user.email === email);
    if (user) {
      let template = readFileSync(
        "./helpers/verification-code-template.html",
        "utf8"
      );
      let code = Math.ceil(Math.random() * 1000000);
      if (code.toString().length < 6) {
        code *= 10;
      }
      template = template.replace("{{verificationCode}}", code);
      let response = await sendMail(
        email,
        "Verification code from TableTech",
        template
      );
      if (response) {
        await store(`/users/${user?.userID}/verificationCode`, code);
        await store(`/users/${user?.userID}/verificationTime`, Date.now());
        return makeResponse(res, "Verification code sent on the given Email");
      }
      return makeResponse(res, SOMETHING_WENT_WRONG, SERVER_ERROR);
    }
  }
  return makeResponse(res, USER_NOT_FOUND, NOT_FOUND);
};

module.exports.verifyCode = async (req, res) => {
  let { email, code } = req.body;

  if (!email) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);
  if (!code) return makeResponse(res, CODE_EMPTY, BAD_REQUEST);

  let allUsers = await fetch("/users/");
  if (allUsers) {
    let user = Object.values(allUsers).find((user, _) => user.email === email);
    if (user) {
      if (user.verificationCode === parseInt(code)) {
        let expirationTime =
          user.verificationTime +
          process.env.VERIFICATION_EXPIRATION_PERIOD * 60 * 1000;
        if (Date.now() < expirationTime) {
          let randomPassword = generatePassword.generate({
            length: 7,
            excludeSimilarCharacters: true,
            numbers: true,
            symbols: true,
            lowercase: true,
            uppercase: true,
          });
          let templateData = readFileSync(
            "./helpers/password-reset-template.html",
            "utf8"
          );
          templateData = templateData.replace(
            "{{userPassword}}",
            randomPassword
          );
          let hashedPassword = await generateHash(randomPassword);
          await store(`/users/${user.userID}/password`, hashedPassword);
          await remove(`/users/${user.userID}/verificationCode`);
          await remove(`/users/${user.userID}/verificationTime`);
          let response = await sendMail(
            user.email,
            "Password Reset from TableTech",
            templateData
          );
          if (response) return makeResponse(res, PASSWORD_RESET_SUCCESS);
          return makeResponse(res, SOMETHING_WENT_WRONG, SERVER_ERROR);
        }
        return makeResponse(res, CODE_EXPIRED, BAD_REQUEST);
      }
      return makeResponse(res, CODE_NOT_MATCHED, BAD_REQUEST);
    }
  }
  return makeResponse(res, USER_NOT_FOUND, NOT_FOUND);
};

module.exports.verifyEmail = async (req, res) => {``
  let { email, code } = req.body;

  if (!email) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);
  if (!code) return makeResponse(res, CODE_EMPTY, BAD_REQUEST);

  let allUsers = await fetch("/users/");
  if (allUsers) {
    let user = Object.values(allUsers).find((user, _) => user.email === email);
    if (user) {
      if (user.verificationCode === parseInt(code)) {
        let expirationTime =
          user.verificationTime +
          process.env.VERIFICATION_EXPIRATION_PERIOD * 60 * 1000;
        if (Date.now() < expirationTime) {
          await store(`/users/${user.userID}/isVerified`, true);
          await remove(`/users/${user.userID}/verificationCode`);
          await remove(`/users/${user.userID}/verificationTime`);
          let profile = await fetch(`/users/${user.userID}`);
          return makeResponse(res, "Email verified successfully", OK, {
            profile,
          });
        }
        return makeResponse(res, CODE_EXPIRED, BAD_REQUEST);
      }
      return makeResponse(res, CODE_NOT_MATCHED, BAD_REQUEST);
    }
  }
  return makeResponse(res, USER_NOT_FOUND, NOT_FOUND);
};

module.exports.resetPassword = async (req, res) => {
  let { userID } = req.body;

  if (!userID) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let user = await fetch(`/users/${userID}`);
  if (user) {
    let randomPassword = generatePassword.generate({
      length: 7,
      excludeSimilarCharacters: true,
      numbers: true,
      symbols: true,
      lowercase: true,
      uppercase: true,
    });
    let templateData = readFileSync(
      "./helpers/password-reset-template.html",
      "utf8"
    );
    templateData = templateData.replace("{{userPassword}}", randomPassword);
    let hashedPassword = await generateHash(randomPassword);
    await store(`/users/${userID}/password`, hashedPassword);
    await sendMail(user.email, "Password Reset from TableTech", templateData);
    return makeResponse(res, PASSWORD_RESET_SUCCESS);
  }
  return makeResponse(res, USER_NOT_FOUND, NOT_FOUND);
};

module.exports.changePassword = async (req, res) => {
  let { oldPassword, newPassword, confirmPassword } = req.body;
  let user = req.user;

  if (!oldPassword) return makeResponse(res, OLD_PASSWORD_EMPTY, BAD_REQUEST);
  if (!newPassword) return makeResponse(res, NEW_PASSWORD_EMPTY, BAD_REQUEST);
  if (!confirmPassword)
    return makeResponse(res, CONFIRM_PASSWORD_EMPTY, BAD_REQUEST);

  if (!user?.userID)
    return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  if (newPassword !== confirmPassword)
    return makeResponse(res, NEW_AND_CONFIRM_NOT_MATCHED, BAD_REQUEST);

  let { hasUppercase, hasLowercase, hasNumeric } = false;
  for (let i = 0; i < newPassword.length; i++) {
    if (newPassword[i] >= "A" && newPassword[i] <= "Z") hasUppercase = true;
    else if (newPassword[i] >= "a" && newPassword[i] <= "z")
      hasLowercase = true;
    else if (newPassword[i] >= "0" && newPassword[i] <= "9") hasNumeric = true;
  }

  if (!(hasUppercase && hasLowercase && hasNumeric && newPassword.length >= 7))
    return makeResponse(
      res,
      "The New password should be atleast 7 characters containing atleast one uppercase, lowercase and numeric characters",
      BAD_REQUEST
    );

  let storedPassword = await fetch(`/users/${user?.userID}/password`);
  if (await compareHash(oldPassword, storedPassword)) {
    await store(
      `/users/${user.userID}/password`,
      await generateHash(newPassword)
    );
    return makeResponse(res, PASSWORD_CHANGED_SUCCESS);
  }
  return makeResponse(res, INCORRECT_OLD_PASSWORD, BAD_REQUEST);
};

module.exports.logout = async (req, res) => {
  let user = req.user;
  await store(`/users/${user.userID}/status`, "Offline");
  return makeResponse(res, LOGOUT_SUCCESS);
};
