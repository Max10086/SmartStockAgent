import { getAllReports } from "@/lib/db/report-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowLeft, Clock, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

// Ensure this page is dynamic since it fetches data
export const dynamic = "force-dynamic";

function timeAgo(date: Date) {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  
  return Math.floor(seconds) + " seconds ago";
}

export default async function HistoryPage() {
  const { reports } = await getAllReports(1, 50);

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="icon" className="bg-gray-900 border-gray-700 hover:bg-gray-800 text-white">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="text-3xl font-bold">Research History</h1>
          </div>
          <Link href="/">
             <Button className="bg-blue-600 hover:bg-blue-700">
               New Research
             </Button>
          </Link>
        </div>

        <div className="grid gap-4">
          {reports.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-12 pb-12 text-center text-gray-400 flex flex-col items-center">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p className="text-lg mb-2">No reports found yet</p>
                <p className="text-sm text-gray-500">Start a new research to see it here</p>
              </CardContent>
            </Card>
          ) : (
            reports.map((report) => (
              <Link href={`/report/${report.id}`} key={report.id}>
                <Card className="bg-gray-900 border-gray-800 hover:border-blue-500/50 transition-all cursor-pointer group">
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                      <CardTitle className="text-xl flex items-center gap-3">
                        <span className="text-blue-400 font-bold">{report.ticker}</span>
                        <Badge variant="outline" className="text-xs bg-gray-800 border-gray-700 text-gray-300">
                          {report.language === "cn" ? "中文" : "English"}
                        </Badge>
                      </CardTitle>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        <span>
                          {timeAgo(new Date(report.createdAt))}
                        </span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-blue-900/10 text-blue-400 group-hover:bg-blue-900/30 border-none">
                      View Report
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 line-clamp-2 text-sm mb-3">
                      {report.summary || "No summary available"}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      <span>{report._count?.chains || 0} Logic Chains</span>
                      <span>•</span>
                      <span>{report.totalTokens.toLocaleString()} tokens</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
