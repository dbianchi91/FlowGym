import skillsDataJson from '../data/skills.json';
import { getSkillStats, getSkillHistoryLastN } from '../data/database';

export type Skill = {
    id: string;
    title: string;
    category: string;
    description: string;
    duration_minutes: number;
    steps: string[];
};

const skillsData: Skill[] = skillsDataJson as Skill[];

// --- Math Utilities for Thompson Sampling (Beta Distribution) --- //

// Gamma distribution generator using Marsaglia and Tsang method
function gammaSample(k: number): number {
    if (k < 1) {
        return gammaSample(1 + k) * Math.pow(Math.random(), 1 / k);
    }
    const d = k - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    let u, v, x;
    while (true) {
        do {
            x = normalSample();
            v = 1 + c * x;
        } while (v <= 0);
        v = v * v * v;
        u = Math.random();
        if (u < 1 - 0.0331 * x * x * x * x) return d * v;
        if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
}

// Standard normal distribution generator (Box-Muller)
function normalSample(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

// Beta distribution sampler via Gamma
function betaSample(alpha: number, beta: number): number {
    const x = gammaSample(alpha);
    const y = gammaSample(beta);
    if (x + y === 0) return 0.5;
    return x / (x + y);
}

// --- Smart Rule Engine --- //

export const determineSkill = async (energy: number, mood: number, focus: number, sleep: number, drive: number): Promise<Skill> => {
    // 1. Identify primary distress area
    const scores = { energy, mood, focus, sleep, drive };
    let lowestAttribute = 'none';
    let lowestScore = 6;

    for (const [key, value] of Object.entries(scores)) {
        if (value < lowestScore) {
            lowestScore = value;
            lowestAttribute = key;
        }
    }

    let selectedCategory = 'Mente';
    if (lowestAttribute === 'energy' || lowestAttribute === 'sleep') {
        selectedCategory = 'Movimento'; // low energy/sleep -> light physical activation
    } else if (lowestAttribute === 'mood') {
        selectedCategory = 'Mente'; // low mood -> mindset / breathing
    } else if (lowestAttribute === 'focus' || lowestAttribute === 'drive') {
        selectedCategory = 'Produttività'; // low focus/drive -> tactical action
    }

    const suitableSkills = skillsData.filter(skill => skill.category === selectedCategory);
    if (suitableSkills.length === 0) return skillsData[0]; // safety fallback

    // 2. Load History for Variety Constraints (Last 3 days)
    const history = await getSkillHistoryLastN(3);
    const recentSkillIds = history.map(h => h.skill_id);

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split('T')[0];
    const yesterdayHistory = history.filter(h => h.date >= yesterdayStr).map(h => h.skill_id);

    // 3. Thompson Sampling Bandit
    let bestSkill = suitableSkills[0];
    let maxScore = -1;

    for (const skill of suitableSkills) {
        const stats = await getSkillStats(skill.id);

        // Multi-Armed Bandit state: success (alpha) vs failure (beta)
        const alpha = (stats?.completed || 0) + 1;
        const beta = ((stats?.skipped || 0) + (stats?.postponed || 0)) + 1;

        let score = betaSample(alpha, beta);

        // Add tiny noise to ensure completely unplayed skills get random chance to beat each other
        score += (Math.random() * 0.05);

        // Apply Variety Penalties
        if (yesterdayHistory.includes(skill.id)) {
            score *= 0.1; // Extreme penalty if done yesterday
        } else if (recentSkillIds.includes(skill.id)) {
            score *= 0.4; // Harsh penalty if done in last 3 days
        }

        if (score > maxScore) {
            maxScore = score;
            bestSkill = skill;
        }
    }

    return bestSkill;
};
