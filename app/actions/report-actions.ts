"use server";

/**
 * Fetch a saved report by ID
 */
export async function getSavedReport(id: string) {
  try {
    const { getReportById, dbReportToAppTypes } = await import("@/lib/db/report-service");
    const dbReport = await getReportById(id);
    
    if (!dbReport) return null;
    
    try {
      return dbReportToAppTypes(dbReport);
    } catch (e) {
      console.error("Error converting db report to app types:", e);
      return null;
    }
  } catch (error) {
    console.error("Error fetching saved report:", error);
    return null;
  }
}
