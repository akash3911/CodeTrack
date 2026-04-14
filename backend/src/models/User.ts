export interface IUser {
  _id: string;
  username: string;
  email: string;
  passwordHash?: string;
  displayName?: string;
  avatar?: string;
  solvedProblems: string[];
  starredProblems: string[];
  createdAt: Date;
  updatedAt: Date;
}
