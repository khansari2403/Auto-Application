import { runQuery } from '../database';
import axios from 'axios';

export async function checkReputation(company: string, role: string) {
  return { isFlagged: false, reportCount: 0 }; 
}

export async function reportGhostJob(jobData: any, reason: string) {
  console.log(`GJN: Reporting ${jobData.companyName}...`);
}