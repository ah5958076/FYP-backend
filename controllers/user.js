const {
  NOT_ALLOWED,
  BAD_REQUEST,
  CREATED,
  SERVER_ERROR,
  NOT_FOUND,
  OK,
} = require("../constants/constants");
const {
  OPERATION_NOT_ALLOWED,
  FULLNAME_EMPTY,
  GENDER_EMPTY,
  EMAIL_EMPTY,
  POSITION_EMPTY,
  CNIC_EMPTY,
  PHONE_EMPTY,
  ADDRESS_EMPTY,
  USER_ALREADY_EXISTS,
  SOMETHING_WENT_WRONG,
  SIGNUP_SUCCESS,
  USER_NOT_FOUND,
} = require("../constants/messages");
const { fetch, store, removeFile } = require("../helpers/DBHandler");
const { makeResponse, generateHash, sendMail } = require("../helpers/general");
const { readFileSync } = require("fs");
const generatePassword = require("generate-password");

module.exports.store = async (req, res) => {
  if (req.user?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let { fullName, email, gender, position, cnic, phone, address } = req.body;

  if (!fullName) return makeResponse(res, FULLNAME_EMPTY, BAD_REQUEST);
  if (!email) return makeResponse(res, EMAIL_EMPTY, BAD_REQUEST);
  if (!gender) return makeResponse(res, GENDER_EMPTY, BAD_REQUEST);
  if (!position) return makeResponse(res, POSITION_EMPTY, BAD_REQUEST);
  if (!cnic) return makeResponse(res, CNIC_EMPTY, BAD_REQUEST);
  if (!phone) return makeResponse(res, PHONE_EMPTY, BAD_REQUEST);
  if (!address) return makeResponse(res, ADDRESS_EMPTY, BAD_REQUEST);

  let existingUser = await fetch(`/users`);

  let user = [];
  if (existingUser) {
    user = Object.keys(existingUser).filter(
      (userKey) => existingUser[userKey].email === email
    );
  }
  if (user.length) return makeResponse(res, USER_ALREADY_EXISTS, CREATED);

  let randomPassword = generatePassword.generate({
    length: 7,
    excludeSimilarCharacters: true,
    numbers: true,
    symbols: true,
    lowercase: true,
    uppercase: true,
  });

  let userID = Date.now();
  let userData = {
    userID,
    fullName,
    email,
    gender,
    position,
    cnic,
    phone,
    address,
    password: await generateHash(randomPassword),
    status: "Offline",
    isVerified: false,
    image: "",
  };

  let templateData = readFileSync(
    "./helpers/new-user-password-template.html",
    "utf8"
  );
  templateData = templateData
    .replace("{{userEmail}}", email)
    .replace("{{userPassword}}", randomPassword);

  try {
    await store(`/users/${userID}/`, userData);
    await sendMail(email, "Welcome to TableTech", templateData);
  } catch (e) {
    return makeResponse(res, SOMETHING_WENT_WRONG, SERVER_ERROR);
  }
  return makeResponse(res, SIGNUP_SUCCESS);
};

module.exports.update = async (req, res) => {
  let { userID } = req.params;

  if (!userID) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let data = req.body;
  let dataKeys = Object.keys(data);
  for (let i = 0; i < dataKeys.length; i++) {
    if (!data[dataKeys[i]])
      return makeResponse(res, "Fill empty field first", BAD_REQUEST);
  }

  for (let i = 0; i < dataKeys.length; i++)
    await store(`/users/${userID}/${dataKeys[i]}`, data[dataKeys[i]]);
  return makeResponse(res, "Data saved successfully");
};

module.exports.show = async (req, res) => {
  if (req.user?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let { email } = req.params;

  if (!email) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let allUsers = await fetch("/users/");
  let allUserKeys = Object.keys(allUsers);
  let userKey = allUserKeys.find((keys, _) => allUsers[keys].email === email);
  let user = allUsers[userKey];

  if (user) return makeResponse(res, "User Found", OK, { user });
  return makeResponse(res, USER_NOT_FOUND, NOT_FOUND);
};

module.exports.showProfile = async (req, res) => {
  let { email } = req.params;

  if (!email) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let allUsers = await fetch("/users/");
  let allUserKeys = Object.keys(allUsers);
  let userKey = allUserKeys.find((keys, _) => allUsers[keys].email === email);
  let user = allUsers[userKey];

  if (user) return makeResponse(res, "User Found", OK, { user });
  return makeResponse(res, USER_NOT_FOUND, NOT_FOUND);
};

module.exports.list = async (req, res) => {
  let loginUser = req.user;
  if (loginUser?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let allUsers = await fetch("/users/");
  let allUserValues = Object.values(allUsers);

  allUserValues = allUserValues.filter(
    (user, _) => user.email !== loginUser?.email
  );

  if (allUserValues.length)
    return makeResponse(res, "Users found", OK, { users: allUserValues });
  return makeResponse(res, USER_NOT_FOUND, NOT_FOUND);
};

module.exports.search = async (req, res) => {
  let loginUser = req.user;
  let searchStr = req.query?.searchString || "";

  let allUsers = await fetch("/users/");
  let allUserValues = Object.values(allUsers);
  let searchedUsers = allUserValues.filter(
    (user, _) =>
      user.fullName.toLowerCase().includes(searchStr) &&
      user?.email !== loginUser?.email
  );

  return makeResponse(res, "", OK, { users: searchedUsers });
};

module.exports.uploadImage = async (req, res) => {
  let { userID, imageName, imageURL } = req?.body;

  if (!userID || !imageName || !imageURL)
    return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let user = await fetch(`/users/${userID}`);
  if (user) {
    removeFile(user.image?.name)
      .then(async () => {
        await store(`/users/${userID}/image`, {
          name: imageName,
          url: imageURL,
        });
        let refreshedUser = await fetch(`/users/${userID}`);
        delete refreshedUser?.password;
        return makeResponse(
          res,
          "Image uploaded successfully",
          OK,
          refreshedUser
        );
      })
      .catch(() => {});
  } else return makeResponse(res, USER_NOT_FOUND, NOT_FOUND);
};
