import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Edit2, Send } from "lucide-react";
import toast from "react-hot-toast";

interface FieldEditRequestProps {
    label: string;
    fieldKey: string;
    currentValue: any;
    apiEndpoint: string; // e.g., `/api/sales/orders/${id}`
    type?: string; // 'text', 'number', 'date', 'textarea', 'enum'
    options?: { value: string; label: string }[]; // For select/enum types
    onSuccess?: () => void;
}

export function FieldEditRequest({ label, fieldKey, currentValue, apiEndpoint, type = "text", options, onSuccess }: FieldEditRequestProps) {
    const [open, setOpen] = useState(false);
    const [newValue, setNewValue] = useState(currentValue || "");
    const [loading, setLoading] = useState(false);

    // Initialize new value when opening the dialog
    const handleOpenChange = (isOpen: boolean) => {
        if (isOpen) {
            setNewValue(currentValue || "");
        }
        setOpen(isOpen);
    };

    const handleSubmit = async () => {
        if (newValue === currentValue) {
            setOpen(false);
            return;
        }

        setLoading(true);
        try {
            // Send ONLY the specific field that the user wants to change
            const payload: Record<string, any> = { [fieldKey]: newValue };

            const res = await fetch(apiEndpoint, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.status === 202 || res.ok) {
                // Success: Request sent to admin or auto-approved
                toast.success(`Change request for ${label} successful.`);
                setOpen(false);
                // Dispatch custom event to let parent components know standard mutation occurred and they might want to reload
                window.dispatchEvent(new Event('entry-updated'));

                if (onSuccess) {
                    onSuccess();
                }
            } else {
                toast.error("Failed to submit request.");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error submitting request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 shrink-0" title={`Request change for ${label}`}>
                    <Edit2 className="h-4 w-4" />
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md z-[9999]">
                <DialogHeader>
                    <DialogTitle>Request Change: {label}</DialogTitle>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] block mb-1">Current Value</span>
                        <div className="bg-[hsl(var(--muted))] p-2 rounded text-sm text-[hsl(var(--foreground))]">{currentValue || "(empty)"}</div>
                    </div>
                    <div>
                        <span className="text-xs font-bold text-blue-600 block mb-1">Proposed New Value</span>

                        {type === "textarea" ? (
                            <textarea
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                                placeholder={`Enter new ${label.toLowerCase()}...`}
                                rows={4}
                            />
                        ) : type === "enum" && options ? (
                            <select
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={newValue}
                                onChange={(e) => setNewValue(e.target.value)}
                            >
                                <option value="">Select {label}</option>
                                {options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        ) : (
                            <input
                                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                type={type}
                                value={newValue}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewValue(e.target.value)}
                                placeholder={`Enter new ${label.toLowerCase()}...`}
                            />
                        )}
                    </div>
                </div>
                <DialogFooter>
                    <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input hover:bg-accent hover:text-accent-foreground h-10 py-2 px-4" onClick={() => setOpen(false)}>Cancel</button>
                    <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 h-10 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:pointer-events-none" onClick={handleSubmit} disabled={loading}>
                        {loading ? "Sending..." : <><Send className="w-4 h-4 mr-2" /> Send Request</>}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
