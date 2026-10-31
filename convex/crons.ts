import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();
crons.interval('sweep players and invitations', { minutes: 1 }, internal.accounts.sweep, {});
export default crons;
