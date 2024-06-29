const { initializeApp } = require("firebase/app");
const { ref, get, set, remove, getDatabase } = require("firebase/database");
const firebaseStorageInstance = require("firebase/storage");
const firebaseConfigs = require("../firebaseConfig");
const { SOMETHING_WENT_WRONG } = require("../constants/messages");

const firebaseApp = initializeApp(firebaseConfigs);
const firebaseDatabase = getDatabase(firebaseApp);
const firebaseStorage = firebaseStorageInstance.getStorage(firebaseApp);

module.exports.store = (path, data) => {
  return new Promise(async (resolve, reject) => {
    await set(ref(firebaseDatabase, path), data).catch((err) => {
      reject(err);
    });
    resolve();
  });
};

module.exports.fetch = (path) => {
  return new Promise(async (resolve, reject) => {
    let value = await get(ref(firebaseDatabase, path)).catch((err) => {
      reject(err);
    });
    if (value.exists()) resolve(value.val());
    resolve(null);
  });
};

module.exports.remove = (path) => {
  return new Promise(async (resolve, reject) => {
    await remove(ref(firebaseDatabase, path)).catch((err) => {
      reject(err);
    });
    resolve();
  });
};

module.exports.removeFile = (fileName) => {
  return new Promise(async (resolve, reject) => {
    if (!fileName) return resolve("File not found");

    let fileRef = firebaseStorageInstance.ref(firebaseStorage, fileName);
    firebaseStorageInstance
      .deleteObject(fileRef)
      .then(() => {
        resolve("File removed");
      })
      .catch(() => {
        reject(SOMETHING_WENT_WRONG);
      });
  });
};
