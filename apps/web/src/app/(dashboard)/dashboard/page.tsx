import { Card } from '@/components/ui/card';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <p className="text-sm font-medium text-gray-500">SWMS This Month</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Unpaid Invoices</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Pending Quotes</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
        </Card>
        <Card>
          <p className="text-sm font-medium text-gray-500">Certifications</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">-</p>
        </Card>
      </div>
      <Card className="mt-6">
        <p className="text-gray-500 text-center py-8">
          Dashboard with live data coming in Phase 2. Auth and navigation are working.
        </p>
      </Card>
    </div>
  );
}
