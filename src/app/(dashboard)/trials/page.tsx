import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Eye, FlaskConical } from "lucide-react";
import Link from "next/link";
import { getAllTrials } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const phaseColors: Record<string, "default" | "secondary" | "outline"> = {
  "Phase I": "outline",
  "Phase II": "secondary",
  "Phase III": "default",
  "Phase IV": "secondary",
};

const statusColors: Record<string, "default" | "success" | "warning" | "destructive" | "secondary"> = {
  active: "success",
  planning: "warning",
  completed: "secondary",
  suspended: "destructive",
};

export default async function TrialsPage() {
  const trials = await getAllTrials();

  return (
    <div>
      <Topbar title="Clinical Trials" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">All Trials</h2>
            <p className="text-sm text-muted-foreground">{trials.length} total trials</p>
          </div>
          <Link href="/trials/new">
            <Button><Plus className="h-4 w-4" /> New Trial</Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trial Name</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sponsor</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>Sites</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trials.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <FlaskConical className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-muted-foreground">No trials yet. Create your first trial.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  trials.map((trial) => (
                    <TableRow key={trial.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{trial.trial_name}</p>
                          {trial.protocol_number && (
                            <p className="text-xs text-muted-foreground">{trial.protocol_number}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={phaseColors[trial.trial_phase] || "outline"}>{trial.trial_phase}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[trial.status ?? "planning"] || "secondary"}>{trial.status ?? "planning"}</Badge>
                      </TableCell>
                      <TableCell>{trial.sponsor || "—"}</TableCell>
                      <TableCell>{formatDate(trial.start_date)}</TableCell>
                      <TableCell>{(trial as any).sites?.length || 0}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/trials/${trial.id}`}>
                          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
