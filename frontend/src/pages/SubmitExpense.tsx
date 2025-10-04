import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { expenseApi, companyApi, ocrApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";

const currencies = ["USD", "EUR", "GBP", "INR", "CAD", "AUD", "JPY", "CNY", "SGD", "CHF"];

const SubmitExpense = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [formData, setFormData] = useState({
    description: "",
    category: "",
    expenseDate: "",
    amount: "",
    currency: "USD",
    tags: ""
  });

  // Fetch expense categories
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await companyApi.getCategories();
      return response.data?.categories || [];
    },
  });

  // Submit expense mutation
  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      return await expenseApi.create(data);
    },
    onSuccess: () => {
      toast({
        title: "Success!",
        description: "Your expense has been submitted for approval.",
      });
      setTimeout(() => navigate("/employee-expenses"), 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit expense",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      
      toast({
        title: "Receipt uploaded",
        description: "Processing receipt with OCR..."
      });

      // Try OCR extraction
      setIsProcessingOCR(true);
      try {
        console.log('🔍 Starting OCR extraction for file:', file.name);
        const response = await ocrApi.extractReceipt(file);
        console.log('📄 OCR Response:', response);
        
        if (response.data) {
          // Auto-fill form with OCR data
          const ocrData = response.data;
          console.log('📊 OCR Data:', ocrData);
          console.log('📊 OCR Raw Text:', ocrData.ocrData?.rawText);
          console.log('📊 OCR Confidence:', ocrData.ocrData?.confidence);
          console.log('📊 Used Fallback:', ocrData.ocrData?.usedFallback);
          
          // Update form with extracted data
          setFormData(prev => ({
            ...prev,
            description: ocrData.description || prev.description,
            amount: ocrData.amount ? ocrData.amount.toString() : prev.amount,
            currency: ocrData.currency || prev.currency,
            category: ocrData.category || prev.category,
            expenseDate: ocrData.expenseDate || prev.expenseDate,
          }));
          
          // Show different messages based on OCR quality
          if (ocrData.ocrData?.usedFallback) {
            toast({
              title: "OCR Complete (Fallback)",
              description: "Receipt processed with basic parsing. Please verify the data.",
              variant: "default",
            });
          } else if (ocrData.ocrData?.confidence < 0.7) {
            toast({
              title: "OCR Complete (Low Confidence)",
              description: "Receipt processed but confidence is low. Please verify the data.",
              variant: "default",
            });
          } else {
            toast({
              title: "OCR Complete",
              description: "Receipt data extracted successfully!",
            });
          }
        } else {
          console.warn('⚠️ No OCR data received');
          toast({
            title: "OCR Warning",
            description: "No data extracted from receipt. Please fill manually.",
            variant: "destructive",
          });
        }
      } catch (error: any) {
        console.error('❌ OCR failed:', error);
        toast({
          title: "OCR Failed",
          description: error.message || "Could not extract data from receipt. Please fill manually.",
          variant: "destructive",
        });
      } finally {
        setIsProcessingOCR(false);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const submitFormData = new FormData();
    submitFormData.append('amount', formData.amount);
    submitFormData.append('currency', formData.currency);
    submitFormData.append('category', formData.category);
    submitFormData.append('description', formData.description);
    submitFormData.append('expenseDate', formData.expenseDate);
    
    if (formData.tags) {
      submitFormData.append('tags', JSON.stringify(formData.tags.split(',').map(t => t.trim())));
    }
    
    if (receiptFile) {
      submitFormData.append('receipt', receiptFile);
    }

    submitMutation.mutate(submitFormData);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/employee-expenses")}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Expenses
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Submit New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Receipt Upload */}
              <div className="space-y-2">
                <Label htmlFor="receipt">Attach Receipt (Optional)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    id="receipt"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessingOCR}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById("receipt")?.click()}
                    className="gap-2"
                    disabled={isProcessingOCR}
                  >
                    {isProcessingOCR ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        {receiptFile ? receiptFile.name : "Upload Receipt"}
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Upload a photo of your receipt. OCR will auto-fill the form.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Description */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleChange("description", e.target.value)}
                    placeholder="e.g., Restaurant bill"
                    required
                  />
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(val) => handleChange("category", val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.filter(cat => cat.isActive).map(cat => (
                        <SelectItem key={cat._id || cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expense Date */}
                <div className="space-y-2">
                  <Label htmlFor="expenseDate">Expense Date</Label>
                  <Input
                    id="expenseDate"
                    type="date"
                    value={formData.expenseDate}
                    onChange={(e) => handleChange("expenseDate", e.target.value)}
                    required
                  />
                </div>

                {/* Amount and Currency */}
                <div className="space-y-2">
                  <Label htmlFor="amount">Total Amount</Label>
                  <div className="flex gap-2">
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => handleChange("amount", e.target.value)}
                      placeholder="0.00"
                      className="flex-1"
                      required
                    />
                    <Select value={formData.currency} onValueChange={(val) => handleChange("currency", val)}>
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map(curr => (
                          <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Amount will be auto-converted to company currency
                  </p>
                </div>

                {/* Tags */}
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="tags">Tags (Optional)</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleChange("tags", e.target.value)}
                    placeholder="e.g., client, lunch, business (comma separated)"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => navigate("/employee-expenses")}
                  disabled={submitMutation.isPending}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={submitMutation.isPending || isProcessingOCR}
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Expense"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default SubmitExpense;
