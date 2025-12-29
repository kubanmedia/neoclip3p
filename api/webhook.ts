import type { NextApiRequest, NextApiResponse } from "next";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_API_KEY!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const jobId = req.query.job_id as string;

  if (!jobId) {
    return res.status(400).json({ error: "Missing job_id" });
  }

  try {
    const status = await fal.queue.status(jobId);

    return res.status(200).json({
      status: status.status,
      result: status.status === "completed" ? status.response : null,
    });
  } catch (error) {
    console.error("Status check failed:", error);
    return res.status(500).json({ error: "Failed to fetch job status" });
  }
        }
