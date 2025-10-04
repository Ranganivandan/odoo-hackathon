import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, X, Loader2, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { expenseApi, approvalApi, type Expense } from "@/lib/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const ManagerApprovals = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedExpenseId, setSelectedExpenseId] = useState<string>("");
  const [rejectComment, setRejectComment] = useState("");

  // Fetch pending approvals
  const { data: expenses = [], isLoading, error } = useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: async () => {
      const response = await expenseApi.getPendingApprovals();
      return response.data?.expenses || [];
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (expenseId: string) => 
      approvalApi.approveOrReject(expenseId, 'approve', 'Approved by manager'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      toast({
        title: "Expense Approved",
        description: "The expense has been approved successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve expense",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ expenseId, comment }: { expenseId: string; comment: string }) => 
      approvalApi.approveOrReject(expenseId, 'reject', comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      setRejectDialogOpen(false);
      setRejectComment("");
      setSelectedExpenseId("");
      toast({
        title: "Expense Rejected",
        description: "The expense has been rejected with your comment.",
        variant: "destructive",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject expense",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleRejectClick = (id: string) => {
    setSelectedExpenseId(id);
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectComment.trim()) {
      toast({
        title: "Comment Required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ expenseId: selectedExpenseId, comment: rejectComment });
  };

  if (error) {
    return (
      <Layout>
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">Error loading approvals. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Manager's View</h1>
            <p className="text-muted-foreground">Review and approve employee expense requests</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Approvals to Review ({expenses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No pending approvals</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Original Amount</TableHead>
                        <TableHead>Company Currency</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense._id}>
                          <TableCell className="font-medium">{expense.description}</TableCell>
                          <TableCell>
                            {expense.employee.firstName} {expense.employee.lastName}
                          </TableCell>
                          <TableCell>{expense.category}</TableCell>
                          <TableCell>{format(new Date(expense.expenseDate), 'MMM dd, yyyy')}</TableCell>
                          <TableCell>
                            {expense.currency} {expense.amount.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {expense.company.currency} {expense.amountInCompanyCurrency.toFixed(2)}
                            <div className="text-xs text-muted-foreground">
                              Rate: {expense.exchangeRate.toFixed(4)}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Button
                                size="sm"
                                onClick={() => handleApprove(expense._id)}
                                className="bg-green-500 hover:bg-green-600 text-white"
                                disabled={approveMutation.isPending}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectClick(expense._id)}
                                className="border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                                disabled={rejectMutation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Rejection Comment Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Expense</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this expense. The employee will receive your comment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectComment">Rejection Reason</Label>
              <Textarea
                id="rejectComment"
                placeholder="e.g., Missing receipt, exceeds budget limit, not a valid business expense..."
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectComment("");
              }}
              disabled={rejectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Expense"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default ManagerApprovals;
