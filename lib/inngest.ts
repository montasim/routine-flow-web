import { Inngest } from "inngest"

export const inngest = new Inngest({ id: "routineflow-web-v2" })

export const occurrenceWindowMaintenance = inngest.createFunction(
  {
    id: "occurrence-window-maintenance",
    name: "Occurrence window maintenance",
    triggers: [{ event: "routineflow/occurrences.generate" }],
  },
  async ({ event, step }) => {
    return step.run("acknowledge-generation-request", () => ({
      accepted: true,
      eventName: event.name,
    }))
  }
)

export const missedDetectionMaintenance = inngest.createFunction(
  {
    id: "missed-detection-maintenance",
    name: "Missed detection maintenance",
    triggers: [{ event: "routineflow/occurrences.detect-missed" }],
  },
  async ({ event, step }) => {
    return step.run("acknowledge-detection-request", () => ({
      accepted: true,
      eventName: event.name,
    }))
  }
)

export const routineflowFunctions = [
  occurrenceWindowMaintenance,
  missedDetectionMaintenance,
]
