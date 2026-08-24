import React, { useState } from 'react';
import Layout from './Layout';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { useFirestoreCollection } from '../../hooks/useFirestoreCollection';
import LoadingSpinner from '../ui/LoadingSpinner';

const Dashboard = () => {
  const [hoveredService, setHoveredService] = useState(null);

  const { items: services, loading: servicesLoading } = useFirestoreCollection('services', {
    orderByField: 'serviceName',
    orderDirection: 'asc'
  });

  const handleService = (service) => {
    // You can add your service logic here
    console.log(`Accessing service: ${service.serviceName}`);
    // For now, just show an alert - you can replace this with navigation or modal
    alert(`Service: ${service.serviceName} will be implemented here`);
  };

  // Sample revenue data - replace with actual data from your backend
  const revenueData = [
    { month: 'Jan', revenue: 450000 },
    { month: 'Feb', revenue: 520000 },
    { month: 'Mar', revenue: 480000 },
    { month: 'Apr', revenue: 610000 },
    { month: 'May', revenue: 550000 },
    { month: 'Jun', revenue: 670000 },
    { month: 'Jul', revenue: 720000 },
    { month: 'Aug', revenue: 680000 },
    { month: 'Sep', revenue: 750000 },
    { month: 'Oct', revenue: 820000 },
    { month: 'Nov', revenue: 780000 },
    { month: 'Dec', revenue: 950000 }
  ];


  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
          {/* Revenue Graph */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Revenue Overview</h2>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Revenue</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={245}>
              <AreaChart
                data={revenueData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                />
                <YAxis 
                  stroke="#6B7280"
                  style={{ fontSize: '12px' }}
                  tickFormatter={(value) => `₹${(value / 100000).toFixed(1)}L`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff', 
                    border: '1px solid #E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                  }}
                  formatter={(value) => `₹${value.toLocaleString('en-IN')}`}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRevenue)" 
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Services Button Group */}
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Services</h2>
            
            {servicesLoading ? (
              <LoadingSpinner message="Loading services..." />
            ) : services.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No services available. Create services in Settings.</p>
              </div>
            ) : (
              <div className="flex flex-wrap justify-center gap-4">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="relative group w-full sm:w-[280px] md:w-[280px] lg:w-[280px] xl:w-[280px]"
                    onMouseEnter={() => setHoveredService(service.id)}
                    onMouseLeave={() => setHoveredService(null)}
                  >
                    <button
                      onClick={() => handleService(service)}
                      className="w-full text-white rounded-xl p-6 shadow-md hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex flex-col items-center justify-center gap-3 min-h-[140px]"
                      style={{ 
                        backgroundColor: service.indicatorColor || '#3B82F6',
                        backgroundImage: service.indicatorColor ? 'none' : 'linear-gradient(to bottom right, #3B82F6, #2563EB)'
                      }}
                    >
                      <span className="material-symbols-outlined text-white text-3xl">
                        {service.serviceIcon || 'room_service'}
                      </span>
                      <span className="font-semibold text-lg">{service.serviceName || 'Unnamed Service'}</span>
                    </button>
                    
                    {/* Tooltip for Description */}
                    {service.description && hoveredService === service.id && (
                      <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs">
                        <div className="relative">
                          <p className="whitespace-normal">{service.description}</p>
                          {/* Tooltip arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
      </div>
    </Layout>
  );
};

export default Dashboard;

