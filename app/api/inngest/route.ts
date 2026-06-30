import { serve } from "inngest/next"

import { inngest, routineflowFunctions } from "@/lib/inngest"

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: routineflowFunctions,
})
