import MonsterTable from 'DB/Monsters/MonsterTable.js';

const JobDisplayNameTable = {
	4218: '召唤师',
	4220: '召唤师宝宝'
};

export function getJobDisplayName(jobId, fallback = '未知') {
	return JobDisplayNameTable[jobId] || MonsterTable[jobId] || fallback;
}

export default JobDisplayNameTable;
