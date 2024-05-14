const User = require("../models/User");
const Note = require("../models/Note");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");

// @desc Get all users
// @route GET /users
// @access Private
const getAllUsers = asyncHandler(async (request, response) => {
  const users = await User.find().select("-password").lean();
  if (!users?.length) {
    return response.status(400).json({ message: "No user found" });
  }
  response.json(users);
});

// @desc Create users
// @route POST /users
// @access Private

const createNewUser = asyncHandler(async (request, response) => {
  const { username, password, roles } = request.body;

  //Confirm data
  if (!username || !password || !Array.isArray(roles) || !roles.length) {
    return response.status(400).json({ message: "All fileds are required" });
  }

  const duplicate = await User.findOne({ username }).lean().exec();

  if (duplicate) {
    return response.status(409).json({ message: "Duplicate Username" });
  }

  //Hash Password
  const hashedPwd = await bcrypt.hash(password, 10); //salt

  const userObject = { username, password: hashedPwd, roles };

  //create and store new user
  const user = await User.create(userObject);

  if (user) {
    response.status(201).json({ message: `New user ${username} was created` });
  } else {
    response.status(400).json({ message: "Invalid user data received" });
  }
});

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = asyncHandler(async (request, response) => {
  const { id, username, roles, active, password } = request.body;
  //Confirm data
  if (
    !username ||
    !id ||
    !Array.isArray(roles) ||
    !roles.length ||
    typeof active !== "boolean"
  ) {
    return response.status(400).json({ message: "All fileds are required" });
  }
  const user = await User.findById(id).exec();

  if (!user) {
    return response.status(400).json({ message: "user Not Found" });
  }

  //Avoiding duplicate username
  const duplicate = await User.findOne({ username }).lean().exec();

  if (duplicate && duplicate?._id.toString() !== id) {
    return response.status(409).json({ message: "Duplicate Username" });
  }

  user.username = username;
  user.roles = roles;
  user.active = active;

  if (password) {
    user.password = await bcrypt.hash(password, 10); //salt
  }
  const updatedUser = await user.save();
  response.json({ message: `${updatedUser.username} updated` });
});

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = asyncHandler(async (request, response) => {
  const { id } = request.body;

  // Confirm data
  if (!id) {
    return response.status(400).json({ message: "User ID Required" });
  }
  // Does the user still have assigned notes?
  const note = await Note.findOne({ user: id }).lean().exec();
  if (note) {
    return response.status(400).json({ message: "User has assigned notes" });
  }
  // Does the user exist to delete?
  const user = await User.findById(id).exec();

  if (!user) {
    return response.status(400).json({ message: "User not found" });
  }

  const { username } = user;
  const result = await user.deleteOne();
  const reply = `Username ${username} with ID ${id} deleted`;
  response.json(reply);
});

module.exports = {
  getAllUsers,
  createNewUser,
  updateUser,
  deleteUser,
};
