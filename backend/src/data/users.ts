import { ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { pool } from './mysql';
import { IUser } from '../models/User';

type UserRow = RowDataPacket & {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  display_name: string;
  avatar: string;
  solved_problems: string;
  starred_problems: string;
  created_at: Date;
  updated_at: Date;
};

const parseJsonArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
};

const toUser = (row: UserRow, includePasswordHash = false): IUser => ({
  _id: String(row.id),
  username: row.username,
  email: row.email,
  displayName: row.display_name || '',
  avatar: row.avatar || '',
  solvedProblems: parseJsonArray(row.solved_problems),
  starredProblems: parseJsonArray(row.starred_problems),
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.updated_at),
  ...(includePasswordHash ? { passwordHash: row.password_hash } : {}),
});

export const findUserById = async (id: string, includePasswordHash = false): Promise<IUser | null> => {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT * FROM users WHERE id = ? LIMIT 1`,
    [Number(id)],
  );
  if (!rows.length) return null;
  return toUser(rows[0], includePasswordHash);
};

export const findUserByEmail = async (email: string, includePasswordHash = false): Promise<IUser | null> => {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1`,
    [email],
  );
  if (!rows.length) return null;
  return toUser(rows[0], includePasswordHash);
};

export const findUserByUsername = async (username: string): Promise<IUser | null> => {
  const [rows] = await pool.query<UserRow[]>(
    `SELECT * FROM users WHERE username = ? LIMIT 1`,
    [username],
  );
  if (!rows.length) return null;
  return toUser(rows[0]);
};

export const createUser = async (input: {
  username: string;
  email: string;
  passwordHash: string;
  displayName?: string;
  avatar?: string;
}): Promise<IUser> => {
  const displayName = input.displayName || '';
  const avatar = input.avatar || '';
  const solvedProblems = JSON.stringify([]);
  const starredProblems = JSON.stringify([]);

  const [result] = await pool.query<ResultSetHeader>(
    `
      INSERT INTO users (username, email, password_hash, display_name, avatar, solved_problems, starred_problems)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.username,
      input.email.toLowerCase(),
      input.passwordHash,
      displayName,
      avatar,
      solvedProblems,
      starredProblems,
    ],
  );

  const created = await findUserById(String(result.insertId));
  if (!created) throw new Error('Failed to create user');
  return created;
};

const updateUserArrayField = async (
  userId: string,
  field: 'solved_problems' | 'starred_problems',
  nextValues: string[],
): Promise<void> => {
  await pool.query(`UPDATE users SET ${field} = ? WHERE id = ?`, [JSON.stringify(nextValues), Number(userId)]);
};

export const addSolvedProblem = async (userId: string, slug: string): Promise<void> => {
  const user = await findUserById(userId);
  if (!user) return;
  if (user.solvedProblems.includes(slug)) return;
  await updateUserArrayField(userId, 'solved_problems', [...user.solvedProblems, slug]);
};

export const removeSolvedProblem = async (userId: string, slug: string): Promise<void> => {
  const user = await findUserById(userId);
  if (!user) return;
  await updateUserArrayField(userId, 'solved_problems', user.solvedProblems.filter((s) => s !== slug));
};

export const toggleStarredProblem = async (userId: string, slug: string): Promise<boolean> => {
  const user = await findUserById(userId);
  if (!user) return false;

  const isStarred = user.starredProblems.includes(slug);
  const next = isStarred
    ? user.starredProblems.filter((s) => s !== slug)
    : [...user.starredProblems, slug];

  await updateUserArrayField(userId, 'starred_problems', next);
  return !isStarred;
};
