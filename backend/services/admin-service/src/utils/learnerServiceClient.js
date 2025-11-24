// Learner Service Client - Helper to call Learner Service via API
const LEARNER_SERVICE_URL = process.env.LEARNER_SERVICE_URL || `http://localhost:${process.env.LEARNER_SERVICE_PORT || 4007}`;

/**
 * Call Learner Service API
 */
async function callLearnerService(endpoint, method = 'GET', body = null, token = null) {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    
    if (token) {
      options.headers['authorization'] = `Bearer ${token}`;
    }
    
    if (body) {
      options.body = JSON.stringify(body);
    }
    
    const response = await fetch(`${LEARNER_SERVICE_URL}${endpoint}`, options);
    
    if (!response.ok) {
      throw new Error(`Learner Service error: ${response.status}`);
    }
    
    return await response.json();
  } catch (err) {
    console.error("❌ Error calling Learner Service:", err);
    throw err;
  }
}

/**
 * Handle mentor banned - reassign learners
 */
export async function handleMentorBanned(mentorId, token = null) {
  return await callLearnerService(`/learners/mentor/${mentorId}/handle-banned`, 'POST', { mentorId }, token);
}

/**
 * Remove learner from mentor
 */
export async function removeLearnerFromMentor(learnerId, mentorId, token = null) {
  return await callLearnerService(`/learners/${learnerId}/remove-mentor`, 'POST', { mentorId }, token);
}

/**
 * Change learner mentor
 */
export async function changeMentor(learnerId, oldMentorId, token = null) {
  return await callLearnerService(`/learners/${learnerId}/change-mentor`, 'POST', { oldMentorId }, token);
}

/**
 * Get available mentors for learner
 */
export async function getAvailableMentorsForLearner(learnerId, token = null) {
  const result = await callLearnerService(`/learners/${learnerId}/available-mentors`, 'GET', null, token);
  return result.mentors || [];
}

