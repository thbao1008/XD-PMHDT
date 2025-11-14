import * as mentorService from "../services/mentorService.js";

// ========== Mentor CRUD ==========
export async function createMentor(req, res) {
  try {
    const result = await mentorService.createMentor(req.body);
    res.status(201).json({ message: "Mentor created", ...result });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function getAllMentors(req, res) {
  try {
    const mentors = await mentorService.getAllMentors();
    res.json({ mentors });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMentorById(req, res) {
  try {
    const mentor = await mentorService.getMentorById(req.params.id);
    if (!mentor) return res.status(404).json({ message: "Mentor not found" });
    res.json(mentor);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateMentor(req, res) {
  try {
    await mentorService.updateMentor(req.params.id, req.body);
    res.json({ message: "Mentor updated" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function removeMentor(req, res) {
  try {
    await mentorService.removeMentor(req.params.id);
    res.json({ message: "Mentor deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

// ========== Learners ==========
export async function getLearnersByMentor(req, res) {
  try {
    const learners = await mentorService.getLearnersByMentor(req.params.id);
    res.json({ learners });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function getMentorByUserId(req, res) {
  try {
    const mentor = await mentorService.getMentorByUserId(req.params.userId);
    if (!mentor) return res.status(404).json({ message: "Mentor not found for this userId" });
    res.json(mentor);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

export async function updateLearnerNote(req, res) {
  try {
    const learner = await mentorService.updateLearnerNote(req.params.learnerId, req.body.note);
    if (!learner) return res.status(404).json({ message: "Learner not found" });
    res.json({ learner });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
}

// ========== Sessions ==========
export async function getSessions(req, res) {
  try {
    const sessions = await mentorService.getSessions(req.params.id);
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function addSessionController(req, res) {
  try {
    const sessions = await mentorService.addSession(req.params.id, req.body);
    res.json({ sessions });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function updateSessionController(req, res) {
  try {
    const sessions = await mentorService.updateSession(req.params.id, req.params.sessionId, req.body);
    res.json({ sessions });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function deleteSessionController(req, res) {
  try {
    const sessions = await mentorService.deleteSession(req.params.id, req.params.sessionId);
    res.json({ sessions });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

export async function addSessionsBatchController(req, res) {
  try {
    const sessions = await mentorService.addSessionsBatch(req.params.id, req.body);
    res.json({ sessions });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}

// ========== Resources ==========
export async function getResources(req, res) {
  try {
    const resources = await mentorService.getResourcesByMentor(req.params.id);
    res.json({ resources });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function createResource(req, res) {
  try {
    const resource = await mentorService.createResource({
      mentor_id: req.params.id,
      ...req.body
    });
    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function updateResource(req, res) {
  try {
    const resource = await mentorService.updateResource(req.params.id, req.body);
    res.json(resource);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

export async function deleteResource(req, res) {
  try {
    await mentorService.deleteResource(req.params.id);
    res.json({ message: "Resource deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

// ========== Report ==========
export async function mentorCreateReport(req, res) {
  try {
    const report = await mentorService.mentorCreateReport(req.body);
    res.json({ report });
  } catch (err) {
    if (err.code === "23505") {
      return res.status(400).json({ message: "Bạn đã report học viên này rồi" });
    }
    res.status(500).json({ message: "Server error" });
  }
}
