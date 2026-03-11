"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SettingsPage() {
  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      </div>
      <p className="text-muted-foreground">Manage your account settings and set e-mail preferences.</p>

      <Tabs defaultValue="general" className="w-full mt-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
        </TabsList>
        
        <TabsContent value="general">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Update your basic account preferences here.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>System Language</Label>
                <Input defaultValue="English" disabled />
              </div>
              <div className="space-y-1">
                <Label>Timezone</Label>
                <Input defaultValue="Africa/Cairo (EET)" disabled />
              </div>
              <Button className="mt-2">Save Preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Manage your password and security protocols.</CardDescription>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-gray-500 mb-4">Password changes are currently managed by the Administrator.</p>
               <Button variant="outline">Request Password Reset</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you receive alerts.</CardDescription>
            </CardHeader>
            <CardContent>
               <p className="text-sm text-gray-500">Email and push notification settings will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
