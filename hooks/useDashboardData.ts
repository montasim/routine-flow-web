import { useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import type { Routine, Occurrence, LogItem, AnalyticsData } from "@/types";

export function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch analytics (which returns routines list enriched too)
      const aRes = await fetch("/api/analytics");
      const aData = await aRes.json();
      if (aData.success) {
        setAnalytics(aData);
        setRoutines(aData.routines);
      }

      // Fetch today's occurrences
      const oRes = await fetch("/api/occurrences");
      const oData = await oRes.json();
      if (oData.success) {
        setOccurrences(oData.occurrences);
      }

      // Fetch logs
      const lRes = await fetch("/api/logs");
      const lData = await lRes.json();
      if (lData.success) {
        setLogs(lData.logs);
      }
    } catch (e) {
      toast.error("Error syncing data with database");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleCompleteOccurrence = async (occId: string) => {
    try {
      const res = await fetch(`/api/occurrences/${occId}/complete`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success("Occurrence completed.");
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to finalize occurrence.");
      }
    } catch (e) {
      toast.error("Connection error.");
    }
  };

  const handleSkipOccurrence = async (occId: string) => {
    try {
      const res = await fetch(`/api/occurrences/${occId}/skip`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast("Occurrence skipped.");
        await fetchAllData();
      } else {
        toast.error(data.error || "Failed to skip.");
      }
    } catch (e) {
      toast.error("Connection error.");
    }
  };

  return {
    loading,
    routines,
    occurrences,
    logs,
    analytics,
    fetchAllData,
    handleCompleteOccurrence,
    handleSkipOccurrence
  };
}
