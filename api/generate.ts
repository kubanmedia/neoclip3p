import type { NextApiRequest, NextApiResponse } from "next";
import { fal } from "@fal-ai/client";

fal.config({
  credentials: process.env.FAL_API_KEY!,
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 🔴 HARD FAIL — no silent credit burn
  if (!process.env.FAL_API_KEY) {
    return res.status(500).json({
      error: "FAL_API_KEY is not configured",
    });
  }

  const { prompt, duration = 5 } = req.body;

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Invalid prompt" });
  }

  // Free-tier guardrail (saves money)
  if (duration > 10) {
    return res.status(403).json({
      error: "Video duration exceeds allowed limit",
    });
  }

  try {
    // 🚀 ASYNC SUBMISSION — no waiting
    const submission = await fal.queue.submit(
      "fal-ai/text-to-video",
      {
        input: {
          prompt,
          duration,
        },
        webhook: {
          url: `${process.env.APP_BASE_URL}/api/webhook`,
        },
      }
    );

    // IMPORTANT: only return job_id
    return res.status(200).json({
      job_id: submission.request_id,
    });
  } catch (error: any) {
    console.error("Fal submission error:", error);
    return res.status(500).json({
      error: "Failed to submit generation job",
    });
  }
}
