import { Request, Response } from 'express';
import { prisma } from '../db.js';

// ═══════════════════════════════════════════
//  COSINE SIMILARITY FUNCTION
// ═══════════════════════════════════════════
// cos(θ) = (A·B) / (||A|| × ||B||)
// Returns 0-1 where 1 = identical vectors
function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magnitudeA += vecA[i] * vecA[i];
        magnitudeB += vecB[i] * vecB[i];
    }

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
}

// ═══════════════════════════════════════════
//  1. STUDENT DASHBOARD: Read pre-calculated matches
// ═══════════════════════════════════════════
export const getMatches = async (req: Request, res: Response): Promise<any> => {
    try {
        const userPayload = (req as any).user;
        const currentUserId = userPayload.id || userPayload._id || userPayload.userId;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // Get user's college
        const user = await prisma.user.findUnique({ 
            where: { id: currentUserId },
            select: { collegeId: true }
        });

        if (!user || !user.collegeId) {
            return res.status(400).json({ success: false, message: "User not linked to a college." });
        }

        // Find the RELEASED cycle for this college (students only see results after RELEASED)
        const releasedCycle = await prisma.matchingCycle.findFirst({
            where: { collegeId: user.collegeId, status: 'RELEASED' },
            orderBy: { endDate: 'desc' }
        });

        if (!releasedCycle) {
            // Check if they have a submission at all
            const hasSubmission = await prisma.submission.findFirst({
                where: { userId: currentUserId }
            });

            if (!hasSubmission) {
                return res.status(400).json({ success: false, message: "Profile incomplete." });
            }

            // They submitted but results aren't released yet
            return res.json({ 
                success: true, 
                matches: [], 
                message: "Matches are being processed. Results will appear once the admin releases them." 
            });
        }

        // Fetch SAVED matches (Top 5 only, pre-calculated)
        const savedMatches = await prisma.matchResult.findMany({
            where: { 
                userId: currentUserId,
                cycleId: releasedCycle.id,
                rank: { lte: 5 } // Only top 5
            },
            orderBy: { rank: 'asc' }
        });

        if (savedMatches.length === 0) {
            return res.json({ success: true, matches: [], message: "No matches found for you in this cycle." });
        }

        // Fetch matched users' details
        const matchedUserIds = savedMatches.map(m => m.matchedUserId);
        const matchedUsersData = await prisma.user.findMany({
            where: { id: { in: matchedUserIds } },
            select: { id: true, name: true, email: true, degree: true, passingYear: true }
        });

        // Format for frontend
        const finalMatches = savedMatches.map(match => {
            const userDetails = matchedUsersData.find(u => u.id === match.matchedUserId);
            return {
                id: match.matchedUserId,
                name: userDetails?.name || "Unknown User",
                email: userDetails?.email || "N/A",
                degree: userDetails?.degree || "N/A",
                passingYear: userDetails?.passingYear || null,
                compatibility: Math.round(match.similarityScore),
                rank: match.rank,
                isSuperMatch: match.isSuperMatch,
                cycleId: match.cycleId,
            };
        });

        res.json({ success: true, matches: finalMatches });

    } catch (error) {
        console.error("Dashboard API Error:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

// ═══════════════════════════════════════════
//  2. MATCHING ENGINE: Cosine Similarity + Isolation Buckets
// ═══════════════════════════════════════════
export const runMatchingEngine = async (req: Request, res: Response): Promise<any> => {
    try {
        const { cycleId, collegeId } = req.body;

        if (!cycleId || !collegeId) {
            return res.status(400).json({ success: false, message: "cycleId and collegeId are required" });
        }

        // ─── GUARD 1: Cycle must be in CLOSED state ───
        const cycle = await prisma.matchingCycle.findUnique({ where: { id: cycleId } });
        if (!cycle) {
            return res.status(404).json({ success: false, message: "Cycle not found." });
        }
        if (cycle.status !== 'CLOSED') {
            return res.status(400).json({ 
                success: false, 
                message: `Engine can only run when cycle is CLOSED. Current status: ${cycle.status}` 
            });
        }

        // ─── GUARD 2: Verify cycle belongs to this college ───
        if (cycle.collegeId !== collegeId) {
            return res.status(403).json({ success: false, message: "Cycle does not belong to this college." });
        }

        console.log(`⚙️ Starting Matching Engine for Cycle: ${cycleId}...`);

        // 1. Fetch Active Questions (for weights & types)
        const questions = await prisma.question.findMany({ 
            where: { collegeId, isActive: true },
            orderBy: { order: 'asc' }
        });

        if (questions.length === 0) {
            return res.status(400).json({ success: false, message: "No active questions found." });
        }

        // 2. Fetch all Submissions with user data for bucketing
        const submissions = await prisma.submission.findMany({ 
            where: { cycleId },
            include: { user: { select: { id: true, degree: true, passingYear: true, collegeId: true } } }
        });

        if (submissions.length < 2) {
            return res.status(400).json({ success: false, message: "Not enough submissions to run matching (need at least 2)." });
        }

        console.log(`   📊 ${submissions.length} submissions found, ${questions.length} active questions`);

        // 3. BUCKET students by (collegeId, degree, passingYear) — Absolute Isolation
        const buckets: Record<string, typeof submissions> = {};
        for (const sub of submissions) {
            const key = `${sub.user.collegeId}|${sub.user.degree || 'UNKNOWN'}|${sub.user.passingYear || 0}`;
            if (!buckets[key]) buckets[key] = [];
            buckets[key].push(sub);
        }

        const bucketKeys = Object.keys(buckets);
        console.log(`   🪣 ${bucketKeys.length} isolation bucket(s): ${bucketKeys.map(k => `[${k}](${buckets[k].length})`).join(', ')}`);

        // 4. Process each bucket independently
        const allMatchesToInsert: any[] = [];
        const BATCH_SIZE = 500; // Batch insert size to prevent OOM

        for (const [bucketKey, bucketSubs] of Object.entries(buckets)) {
            if (bucketSubs.length < 2) {
                console.log(`   ⏭️  Skipping bucket ${bucketKey} — only ${bucketSubs.length} student(s)`);
                continue;
            }

            console.log(`   🔬 Processing bucket: ${bucketKey} (${bucketSubs.length} students)`);

            // Build weighted answer vectors for each student in this bucket
            const studentVectors: Record<string, { vector: number[], strictAnswers: Record<string, string> }> = {};

            for (const sub of bucketSubs) {
                const answers = sub.answers as any[];
                const vector: number[] = [];
                const strictAnswers: Record<string, string> = {};

                for (const q of questions) {
                    const answer = answers.find((a: any) => a.questionId === q.id);

                    if (q.matchType === 'SCALE') {
                        // Weighted scale value: answer * weight
                        const val = answer ? Number(answer.value) : 3; // Default to midpoint
                        vector.push(val * q.weight);
                    } else if (q.matchType === 'STRICT') {
                        // Store strict answers separately for dealbreaker check
                        strictAnswers[q.id] = answer ? String(answer.value) : '';
                    }
                }

                studentVectors[sub.userId] = { vector, strictAnswers };
            }

            // O(N²) comparison within this bucket
            const userIds = bucketSubs.map(s => s.userId);
            const rawMatches: Record<string, { matchedUserId: string, score: number }[]> = {};

            for (let i = 0; i < userIds.length; i++) {
                for (let j = i + 1; j < userIds.length; j++) {
                    const userA = userIds[i];
                    const userB = userIds[j];
                    const dataA = studentVectors[userA];
                    const dataB = studentVectors[userB];

                    // Dealbreaker check: all STRICT questions must match
                    let isDealbreaker = false;
                    for (const qId of Object.keys(dataA.strictAnswers)) {
                        if (dataA.strictAnswers[qId] && dataB.strictAnswers[qId] && 
                            dataA.strictAnswers[qId] !== dataB.strictAnswers[qId]) {
                            isDealbreaker = true;
                            break;
                        }
                    }

                    if (isDealbreaker) continue;

                    // Cosine Similarity on weighted SCALE vectors
                    const similarity = cosineSimilarity(dataA.vector, dataB.vector);
                    const percentage = parseFloat((similarity * 100).toFixed(2));

                    // Store for both directions
                    if (!rawMatches[userA]) rawMatches[userA] = [];
                    if (!rawMatches[userB]) rawMatches[userB] = [];
                    rawMatches[userA].push({ matchedUserId: userB, score: percentage });
                    rawMatches[userB].push({ matchedUserId: userA, score: percentage });
                }
            }

            // Rank and take Top 5 per student
            for (const userId of Object.keys(rawMatches)) {
                const sorted = rawMatches[userId].sort((a, b) => b.score - a.score);
                const top5 = sorted.slice(0, 5);

                top5.forEach((match, index) => {
                    allMatchesToInsert.push({
                        userId,
                        matchedUserId: match.matchedUserId,
                        cycleId,
                        similarityScore: match.score,
                        rank: index + 1,
                        isSuperMatch: match.score >= 90, // 90%+ = Super Match
                    });
                });
            }
        }

        console.log(`   📝 Total match records to insert: ${allMatchesToInsert.length}`);

        // 5. ATOMIC: Delete old results + Insert new + Update status in one transaction
        await prisma.$transaction(async (tx) => {
            // Clear old matches for this cycle
            await tx.matchResult.deleteMany({ where: { cycleId } });

            // Batch insert to prevent memory overflow
            for (let i = 0; i < allMatchesToInsert.length; i += BATCH_SIZE) {
                const batch = allMatchesToInsert.slice(i, i + BATCH_SIZE);
                await tx.matchResult.createMany({ data: batch });
                console.log(`   💾 Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allMatchesToInsert.length / BATCH_SIZE)}`);
            }

            // Update cycle to MATCHED
            await tx.matchingCycle.update({
                where: { id: cycleId },
                data: { status: 'MATCHED' }
            });
        });

        const uniquePairs = allMatchesToInsert.length / 2;
        console.log(`✅ Engine complete! ${uniquePairs} valid pairs generated.`);

        res.json({ 
            success: true, 
            message: `Engine executed! Generated ${uniquePairs} valid pairs across ${bucketKeys.length} isolation bucket(s). Cycle is now MATCHED.` 
        });

    } catch (error) {
        console.error("🔥 Engine Error:", error);
        res.status(500).json({ success: false, message: "Engine failed to process matches." });
    }
};