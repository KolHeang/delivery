'use client';

import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import api from '@/lib/api';
import Badge from '@/components/ui/Badge';
import { MdSearch, MdAccessTime } from 'react-icons/md';
import { useLanguage } from '@/lib/LanguageContext';

const trackingTranslations = {
  en: {
    title: 'Tracking',
    subtitle: 'Track the real-time status of a delivery',
    placeholder: 'Enter Tracking Code or Phone Number...',
    btnTrack: 'Track',
    btnTracking: 'Tracking...',
    notFound: 'No tracking record found for this code or phone',
    trackingCode: 'TRACKING CODE / PHONE',
    from: 'From (Shop)',
    to: 'To (Customer)',
    assignedDrivers: 'Assigned Drivers',
    pickupDriver: 'Pickup Driver',
    deliveryDriver: 'Delivery Driver',
    currentStatus: 'Current Status',
    detailedHistory: 'Detailed Status History',
    part1Title: 'Part 1: Package Collection (Shop to Warehouse)',
    part2Title: 'Part 2: Package Delivery (Delivery to Customer)',
    stepPendingTitle: 'Package Registered',
    stepPendingDesc: 'The merchant has registered the package details.',
    stepInWarehouseTitle: 'Arrived at Warehouse',
    stepInWarehouseDesc: 'The package has arrived at the warehouse hub.',
    stepInWarehouseDescDriver: 'Package brought to warehouse by pickup driver {driverName}.',
    stepAssignedTitle: 'Driver Assigned',
    stepAssignedDesc: 'A delivery driver has been assigned to the package.',
    stepAssignedDescDriver: 'Delivery driver {driverName} has been assigned to deliver the package.',
    stepPickedUpTitle: 'Picked Up',
    stepPickedUpDesc: 'Driver has picked up the package.',
    stepPickedUpDescDriver: 'Package picked up from warehouse by driver {driverName}.',
    stepPickedUpDirectDescDriver: 'Driver {driverName} has picked up the package from the merchant.',
    stepInTransitTitle: 'In Transit',
    stepInTransitDesc: 'Package is on the way to the delivery address.',
    stepDeliveredTitle: 'Delivered / Complete',
    stepDeliveredDesc: 'Package has been successfully received.',
    stepFailedTitle: 'Delivery Failed',
    stepFailedDesc: 'Package delivery failed.',
    stepReturnedTitle: 'Returned Package',
    stepReturnedDesc: 'Package has been returned.',
    unassigned: 'Unassigned',
    none: 'None',
  },
  km: {
    title: 'តាមដានការដឹកជញ្ជូន',
    subtitle: 'តាមដានស្ថានភាពជាក់ស្តែងនៃការដឹកជញ្ជូន',
    placeholder: 'បញ្ចូលលេខកូដតាមដាន ឬ លេខទូរស័ព្ទ...',
    btnTrack: 'តាមដាន',
    btnTracking: 'កំពុងស្វែងរក...',
    notFound: 'មិនរកឃើញព័ត៌មានសម្រាប់លេខកូដ ឬ លេខទូរស័ព្ទនេះទេ',
    trackingCode: 'លេខកូដតាមដាន / ទូរស័ព្ទ',
    from: 'ពីហាង (Shop)',
    to: 'ទៅកាន់ (Customer)',
    assignedDrivers: 'អ្នកដឹកជញ្ជូនដែលបានចាត់តាំង',
    pickupDriver: 'អ្នកទៅយកពីហាង',
    deliveryDriver: 'អ្នកដឹកជូនអតិថិជន',
    currentStatus: 'ស្ថានភាពបច្ចុប្បន្ន',
    detailedHistory: 'ប្រវត្តិស្ថានភាពលម្អិត',
    part1Title: 'ផ្នែកទី១៖ ការប្រមូលកញ្ចប់អីវ៉ាន់ (Shop to Warehouse)',
    part2Title: 'ផ្នែកទី២៖ ការដឹកជញ្ជូនជូនអតិថិជន (Delivery to Customer)',
    stepPendingTitle: 'បានចុះឈ្មោះកញ្ចប់អីវ៉ាន់',
    stepPendingDesc: 'ហាងបានបញ្ចូលទិន្នន័យកញ្ចប់អីវ៉ាន់ទៅក្នុងប្រព័ន្ធ។',
    stepInWarehouseTitle: 'អីវ៉ាន់ដល់ឃ្លាំង',
    stepInWarehouseDesc: 'កញ្ចប់អីវ៉ាន់ត្រូវបានរក្សាទុកនៅឃ្លាំងក្រុមហ៊ុន។',
    stepInWarehouseDescDriver: 'កញ្ចប់អីវ៉ាន់ត្រូវបានដឹកមកដល់ឃ្លាំងដោយអ្នកបើកបរ {driverName}។',
    stepAssignedTitle: 'បានចាត់តាំងអ្នកដឹក',
    stepAssignedDesc: 'អ្នកបើកបរដឹកជញ្ជូនត្រូវបានចាត់តាំងឱ្យដឹកកញ្ចប់អីវ៉ាន់នេះ។',
    stepAssignedDescDriver: 'អ្នកបើកបរដឹកជញ្ជូន {driverName} ត្រូវបានចាត់តាំងឱ្យដឹកកញ្ចប់អីវ៉ាន់នេះ។',
    stepPickedUpTitle: 'បានទទួលកញ្ចប់អីវ៉ាន់',
    stepPickedUpDesc: 'អ្នកដឹកបានទទួលកញ្ចប់អីវ៉ាន់រួចរាល់ហើយ។',
    stepPickedUpDescDriver: 'កញ្ចប់អីវ៉ាន់ត្រូវបានបើកបរ {driverName} ទៅយកចេញពីឃ្លាំង។',
    stepPickedUpDirectDescDriver: 'អ្នកបើកបរ {driverName} បានទៅយកកញ្ចប់អីវ៉ាន់ពីហាងរួចរាល់ហើយ។',
    stepInTransitTitle: 'កំពុងដឹកជញ្ជូន',
    stepInTransitDesc: 'កញ្ចប់អីវ៉ាន់កំពុងធ្វើដំណើរទៅកាន់អាសយដ្ឋានអតិថិជន។',
    stepDeliveredTitle: 'ដឹកជញ្ជូនជោគជ័យ',
    stepDeliveredDesc: 'កញ្ចប់អីវ៉ាន់ត្រូវបានប្រគល់ជូនអតិថិជនរួចរាល់។',
    stepFailedTitle: 'ដឹកជញ្ជូនបរាជ័យ',
    stepFailedDesc: 'ការដឹកជញ្ជូនត្រូវបានបរាជ័យ។',
    stepReturnedTitle: 'បានប្រគល់ត្រឡប់មកវិញ',
    stepReturnedDesc: 'កញ្ចប់អីវ៉ាន់ត្រូវបានប្រគល់ត្រឡប់មកក្រុមហ៊ុនវិញ។',
    unassigned: 'មិនទាន់ចាត់តាំង',
    none: 'មិនមាន',
  }
};

export default function TrackingPage() {
  const [code, setCode] = useState('');
  const [order, setOrder] = useState<any>(null);
  const [error, setError] = useState('');
  const [searching, setSearching] = useState(false);
  const { lang } = useLanguage();

  const tLocal = trackingTranslations[lang] || trackingTranslations['en'];

  const getStatusLabel = (status: string) => {
    const labels: any = {
      en: {
        'pending': 'Package Registered',
        'in-warehouse': 'Arrived at Warehouse',
        'assigned': 'Driver Assigned',
        'picked-up': 'Picked Up',
        'in-transit': 'In Transit',
        'delivered': 'Delivered Successfully',
        'failed': 'Delivery Failed',
        'returned': 'Returned Package',
      },
      km: {
        'pending': 'បានចុះឈ្មោះកញ្ចប់អីវ៉ាន់',
        'in-warehouse': 'អីវ៉ាន់ដល់ឃ្លាំង',
        'assigned': 'បានចាត់តាំងអ្នកដឹក',
        'picked-up': 'បានទទួលកញ្ចប់អីវ៉ាន់',
        'in-transit': 'កំពុងដឹកជញ្ជូន',
        'delivered': 'ដឹកជញ្ជូនជោគជ័យ',
        'failed': 'ដឹកជញ្ជូនបរាជ័យ',
        'returned': 'បានប្រគល់ត្រឡប់មកវិញ',
      }
    };
    const langKey = lang === 'km' ? 'km' : 'en';
    return labels[langKey][status] || status;
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setSearching(true);
    setError('');
    setOrder(null);
    try {
      const res = await api.get(`/orders/tracking/${encodeURIComponent(code.trim())}`);
      if (res.data) {
        setOrder(res.data);
      } else {
        setError(tLocal.notFound);
      }
    } catch {
      setError(tLocal.notFound);
    }
    setSearching(false);
  };

  const isWarehouseFlow = order ? !!(
    order.pickupDriverId ||
    order.warehouseAt ||
    (order.histories && order.histories.some((h: any) => h.status === 'in-warehouse'))
  ) : false;

  const getStepClass = (stepStatus: string) => {
    if (!order) return 'disabled';
    const status = order.status;

    // Direct match for current status
    if (status === stepStatus || 
        (stepStatus === 'delivered' && (status === 'failed' || status === 'returned'))) {
      return 'active';
    }

    // Match if step has already occurred (has a timestamp)
    if (getStepTime(stepStatus)) {
      return 'active';
    }

    return 'disabled';
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString(lang === 'km' ? 'kh-KH' : 'en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStepTime = (statusKey: string) => {
    if (!order) return null;
    if (order.histories && order.histories.length > 0) {
      const sorted = [...order.histories].sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      if (statusKey === 'delivered') {
        const match = sorted.find((h: any) => h.status === 'delivered' || h.status === 'failed' || h.status === 'returned');
        if (match) return match.createdAt;
      } else {
        const match = sorted.find((h: any) => h.status === statusKey);
        if (match) return match.createdAt;
      }
    }
    // Fallback to order fields
    if (statusKey === 'pending') return order.createdAt;
    if (statusKey === 'in-warehouse') return order.warehouseAt;
    if (statusKey === 'assigned') return order.assignedAt;
    if (statusKey === 'picked-up') return order.pickedUpAt;
    if (statusKey === 'in-transit') {
      if (['in-transit', 'delivered', 'failed', 'returned'].includes(order.status)) {
        return order.updatedAt;
      }
    }
    if (statusKey === 'delivered') {
      return order.deliveredAt;
    }
    return null;
  };

  const getCurrentLocationDetails = () => {
    if (!order) return null;
    const status = order.status;
    let custodianEn = '';
    let custodianKh = '';
    let locationEn = '';
    let locationKh = '';

    if (status === 'pending') {
      custodianEn = order.merchant?.name || order.senderName || 'Merchant';
      custodianKh = order.merchant?.nameKh || order.senderName || 'ហាងផ្ញើ';
      locationEn = order.merchant?.address || 'Merchant Store';
      locationKh = order.merchant?.address || 'ហាងផ្ញើ';
    } else if (status === 'in-warehouse') {
      custodianEn = 'EBS Warehouse Hub';
      custodianKh = 'ឃ្លាំងក្រុមហ៊ុន EBS';
      locationEn = 'Main Warehouse Hub';
      locationKh = 'ឃ្លាំងកណ្តាលរបស់ក្រុមហ៊ុន';
    } else if (status === 'assigned') {
      custodianEn = order.driver?.name ? `Driver (${order.driver.name})` : 'Assigned Driver';
      custodianKh = order.driver?.name ? `អ្នកដឹកជញ្ជូន (${order.driver.name})` : 'បានចាត់តាំងអ្នកដឹក';
      locationEn = 'Preparing for dispatch at Warehouse';
      locationKh = 'កំពុងរៀបចំចេញដំណើរពីឃ្លាំង';
    } else if (status === 'picked-up') {
      const driverName = order.pickupDriver?.name || order.driver?.name || 'Driver';
      custodianEn = `Driver (${driverName})`;
      custodianKh = `អ្នកដឹកជញ្ជូន (${driverName})`;
      locationEn = 'In transit to Warehouse Hub';
      locationKh = 'កំពុងដឹកឆ្ពោះទៅកាន់ឃ្លាំងក្រុមហ៊ុន';
    } else if (status === 'in-transit') {
      const driverName = order.driver?.name || 'Driver';
      custodianEn = `Driver (${driverName})`;
      custodianKh = `អ្នកដឹកជញ្ជូន (${driverName})`;
      locationEn = `On the way to Customer Address: ${order.receiverAddress}`;
      locationKh = `កំពុងដឹកទៅកាន់អាសយដ្ឋានអតិថិជន៖ ${order.receiverAddress}`;
    } else if (status === 'delivered') {
      custodianEn = order.receiverName || 'Customer';
      custodianKh = order.receiverName || 'អតិថិជន';
      locationEn = order.receiverAddress || 'Delivery Address';
      locationKh = order.receiverAddress || 'អាសយដ្ឋានទទទួល';
    } else if (status === 'failed') {
      custodianEn = 'EBS Warehouse Hub';
      custodianKh = 'ឃ្លាំងក្រុមហ៊ុន EBS';
      locationEn = `Delivery failed. Returned to Warehouse. Reason: ${order.note || 'None'}`;
      locationKh = `ដឹកជញ្ជូនបរាជ័យ។ បានរក្សាទុកនៅឃ្លាំង។ មូលហេតុ៖ ${order.note || 'គ្មាន'}`;
    } else if (status === 'returned') {
      custodianEn = order.merchant?.name || 'Merchant';
      custodianKh = order.merchant?.nameKh || 'ហាងផ្ញើ';
      locationEn = `Returned to Merchant: ${order.merchant?.address || 'Merchant Location'}`;
      locationKh = `បានប្រគល់ជូនហាងវិញ៖ ${order.merchant?.address || 'ទីតាំងហាង'}`;
    }

    return {
      custodian: lang === 'km' ? custodianKh : custodianEn,
      location: lang === 'km' ? locationKh : locationEn,
      driverPhone: status === 'in-transit' ? order.driver?.phone : (status === 'picked-up' ? (order.pickupDriver?.phone || order.driver?.phone) : null)
    };
  };

  const timelineSteps = order ? (() => {
    const steps = [];
    const status = order.status;

    // 1. Registered By / អ្នកបញ្ចូលបុង
    steps.push({
      key: 'pending',
      title: lang === 'km' ? 'អ្នកបញ្ចូលបុង' : 'Registered By',
      desc: lang === 'km'
        ? `ហាងបញ្ចូលទិន្នន័យ៖ ${order.senderName || order.merchant?.name || ''}`
        : `Registered by: ${order.senderName || order.merchant?.name || ''}`,
      time: order.createdAt,
      isActive: true,
      isCurrent: status === 'pending'
    });

    // 2. Pick UP
    const isPickedUpActive = status !== 'pending';
    const isPickedUpCurrent = isWarehouseFlow 
      ? (status === 'in-warehouse' && !order.driverId)
      : (status === 'picked-up');
    
    let pickupDescKh = '';
    let pickupDescEn = '';
    if (isWarehouseFlow) {
      if (order.pickupDriver) {
        pickupDescKh = `អ្នកទៅយកពីហាង៖ ${order.pickupDriver.name} (នាំចូលឃ្លាំង)`;
        pickupDescEn = `Picked up by pickup driver: ${order.pickupDriver.name} (brought to warehouse)`;
      } else {
        pickupDescKh = `កញ្ចប់អីវ៉ាន់បានដល់ឃ្លាំង`;
        pickupDescEn = `Arrived at warehouse`;
      }
    } else {
      if (order.driver) {
        pickupDescKh = `អ្នកទៅយកពីហាង៖ ${order.driver.name}`;
        pickupDescEn = `Picked up by driver: ${order.driver.name}`;
      } else {
        pickupDescKh = `អ្នកដឹកបានទទួលកញ្ចប់អីវ៉ាន់ពីហាង`;
        pickupDescEn = `Picked up from merchant`;
      }
    }

    steps.push({
      key: 'picked-up',
      title: lang === 'km' ? 'Pick UP' : 'Pick UP',
      desc: lang === 'km' ? pickupDescKh : pickupDescEn,
      time: isWarehouseFlow 
        ? (order.warehouseAt || getStepTime('in-warehouse')) 
        : (order.pickedUpAt || getStepTime('picked-up')),
      isActive: isPickedUpActive,
      isCurrent: isPickedUpCurrent
    });

    // 3. Assign
    const isAssignActive = isWarehouseFlow
      ? ['assigned', 'in-transit', 'delivered', 'failed', 'returned'].includes(status)
      : ['picked-up', 'in-transit', 'delivered', 'failed', 'returned'].includes(status);
    const isAssignCurrent = isWarehouseFlow 
      ? (status === 'assigned') 
      : (status === 'picked-up');

    let assignDescKh = '';
    let assignDescEn = '';
    if (order.driver) {
      assignDescKh = `អ្នកដឹកជញ្ជូន៖ ${order.driver.name}`;
      assignDescEn = `Assigned delivery driver: ${order.driver.name}`;
    } else {
      assignDescKh = `មិនទាន់ចាត់តាំង`;
      assignDescEn = `Unassigned`;
    }

    steps.push({
      key: 'assigned',
      title: lang === 'km' ? 'Assign' : 'Assign',
      desc: lang === 'km' ? assignDescKh : assignDescEn,
      time: isWarehouseFlow 
        ? (order.assignedAt || getStepTime('assigned'))
        : (order.pickedUpAt || getStepTime('picked-up')),
      isActive: isAssignActive,
      isCurrent: isAssignCurrent
    });

    // 4. Status
    const isStatusActive = ['in-transit', 'delivered', 'failed', 'returned'].includes(status);
    const isStatusCurrent = status === 'in-transit';

    let statusDescKh = 'មិនទាន់ដឹកជញ្ជូន';
    let statusDescEn = 'Not in transit';
    if (status === 'in-warehouse') {
      statusDescKh = 'ក្នុងស្តុក (In Stock)';
      statusDescEn = 'In Stock (Warehouse)';
    } else if (status === 'assigned') {
      statusDescKh = 'កំពុងដំណើរការ (In Progress)';
      statusDescEn = 'In Progress';
    } else if (status === 'picked-up') {
      statusDescKh = 'កំពុងដំណើរការ (In Progress)';
      statusDescEn = 'In Progress';
    } else if (status === 'in-transit') {
      statusDescKh = 'កំពុងដឹក (Delivering)';
      statusDescEn = 'Delivering';
    } else if (['delivered', 'failed', 'returned'].includes(status)) {
      statusDescKh = 'បានបញ្ចប់ដំណើរការ';
      statusDescEn = 'Completed';
    }

    steps.push({
      key: 'in-transit',
      title: lang === 'km' ? 'Status' : 'Status',
      desc: lang === 'km' ? `ស្ថានភាព៖ ${statusDescKh}` : `Status: ${statusDescEn}`,
      time: ['in-transit', 'delivered', 'failed', 'returned'].includes(status) ? (order.updatedAt || getStepTime('in-transit')) : null,
      isActive: isStatusActive,
      isCurrent: isStatusCurrent
    });

    // 5. Delivered / ដឹកជោគជ័យ
    const isDeliveredActive = ['delivered', 'failed', 'returned'].includes(status);
    const isDeliveredCurrent = isDeliveredActive;

    let deliveredTitleEn = 'Delivered Successfully';
    let deliveredTitleKh = 'ដឹកជោគជ័យ';
    let deliveredDescEn = 'Package has been successfully received.';
    let deliveredDescKh = 'កញ្ចប់អីវ៉ាន់ត្រូវបានប្រគល់ជូនអតិថិជនរួចរាល់។';

    if (status === 'failed') {
      deliveredTitleEn = 'Delivery Failed';
      deliveredTitleKh = 'ដឹកជញ្ជូនបរាជ័យ';
      deliveredDescEn = `Delivery failed. Reason: ${order.note || 'None'}`;
      deliveredDescKh = `ការដឹកជញ្ជូនត្រូវបានបរាជ័យ។ មូលហេតុ៖ ${order.note || 'គ្មាន'}`;
    } else if (status === 'returned') {
      deliveredTitleEn = 'Returned';
      deliveredTitleKh = 'បានប្រគល់ត្រឡប់មកវិញ';
      deliveredDescEn = `Returned to merchant. Reason: ${order.note || 'None'}`;
      deliveredDescKh = `កញ្ចប់អីវ៉ាន់ត្រូវបានប្រគល់ត្រឡប់មកវិញ។ មូលហេតុ៖ ${order.note || 'គ្មាន'}`;
    } else if (status === 'delivered') {
      deliveredDescEn = order.driver 
        ? `Successfully delivered by: ${order.driver.name}`
        : `Successfully delivered.`;
      deliveredDescKh = order.driver
        ? `ដឹកជញ្ជូនជោគជ័យដោយអ្នកដឹក៖ ${order.driver.name}`
        : `ដឹកជញ្ជូនជោគជ័យ។`;
    }

    steps.push({
      key: 'delivered',
      optionalKey: 'failed',
      optionalKey2: 'returned',
      title: lang === 'km' ? deliveredTitleKh : deliveredTitleEn,
      desc: lang === 'km' ? deliveredDescKh : deliveredDescEn,
      time: order.deliveredAt || getStepTime('delivered'),
      isActive: isDeliveredActive,
      isCurrent: isDeliveredCurrent
    });

    return steps;
  })() : [];

  const renderTimeline = (steps: any[]) => {
    if (!order) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingLeft: 12, position: 'relative' }}>
        <div style={{
          position: 'absolute', left: 23, top: 12, bottom: 12, width: 0, borderLeft: '2px dashed #cbd5e1', zIndex: 1
        }} />

        {steps.map(s => {
          const statusVal = order.status;
          let title = s.title;
          let desc = s.desc;
          let cl = 'var(--text-muted)';

          const isActive = s.isActive;
          const isCurrent = s.isCurrent;
          const isFailed = statusVal === 'failed' && s.key === 'delivered';
          const isReturned = statusVal === 'returned' && s.key === 'delivered';

          if (isActive) {
            cl = 'var(--text-primary)';
          }

          let innerDotColor = '#cbd5e1';
          let outerRingColor = 'rgba(203, 213, 225, 0.2)';

          if (isActive) {
            if (isCurrent) {
              if (isFailed) {
                innerDotColor = '#ef4444'; // Red
                outerRingColor = 'rgba(239, 68, 68, 0.25)';
              } else if (isReturned) {
                innerDotColor = '#6b7280'; // Grey/Black
                outerRingColor = 'rgba(107, 114, 128, 0.25)';
              } else {
                innerDotColor = '#f59e0b'; // Yellow/Orange
                outerRingColor = 'rgba(245, 158, 11, 0.25)';
              }
            } else {
              // Completed past steps
              innerDotColor = '#10b981'; // Green
              outerRingColor = 'rgba(16, 185, 129, 0.25)';
            }
          } else {
            // Disabled/upcoming steps
            innerDotColor = '#0ea5e9'; // Cyan/Blue
            outerRingColor = 'rgba(14, 165, 233, 0.15)';
          }

          const stepTime = s.time;

          return (
            <div key={s.key} style={{ display: 'flex', gap: 16, zIndex: 2, position: 'relative' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: outerRingColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: innerDotColor
                }} />
              </div>
              <div>
                <h5 style={{ fontWeight: 700, fontSize: 13.5, color: cl }}>{title}</h5>
                <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{desc}</p>
                {stepTime && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <MdAccessTime size={13} style={{ color: 'var(--text-muted)' }} />
                    <span>{formatTime(stepTime)}</span>
                  </div>
                )}
                {isCurrent && (
                  <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <MdAccessTime size={14} /> {tLocal.currentStatus}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <Topbar title={tLocal.title} subtitle={tLocal.subtitle} />
        <div className="page-content">
          {/* Tracking box */}
          <div className="card" style={{ marginBottom: 20, padding: 24 }}>
            <form onSubmit={handleTrack} style={{ display: 'flex', gap: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <input
                  type="text"
                  className="form-control"
                  placeholder={tLocal.placeholder}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  style={{ paddingLeft: 16, height: 44, fontSize: 15 }}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ height: 44, padding: '0 24px' }} disabled={searching}>
                <MdSearch size={20} /> {searching ? tLocal.btnTracking : tLocal.btnTrack}
              </button>
            </form>
          </div>

          {/* Results section */}
          {error && (
            <div className="card" style={{ padding: 24, textAlign: 'center', color: 'var(--danger)' }}>
              {error}
            </div>
          )}

          {order && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Main details */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tLocal.trackingCode}</div>
                    <h3 style={{ fontWeight: 800, fontSize: 18, fontFamily: 'monospace', marginTop: 2 }}>{order.trackingCode}</h3>
                  </div>
                  <Badge status={order.status} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24 }}>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>{tLocal.from}</h4>
                    <p style={{ fontWeight: 600 }}>{order.senderName}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.senderPhone}</p>
                  </div>
                  <div>
                    <h4 style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>{tLocal.to}</h4>
                    <p style={{ fontWeight: 600 }}>{order.receiverName}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{order.receiverPhone}</p>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{order.receiverAddress}</p>
                  </div>
                  {(order.pickupDriver || order.driver) && (
                    <div>
                      <h4 style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>{tLocal.assignedDrivers}</h4>
                      {order.pickupDriver && (
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>{tLocal.pickupDriver}</p>
                          <p style={{ fontWeight: 600, margin: '2px 0 0 0' }}>{order.pickupDriver.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>📞 {order.pickupDriver.phone}</p>
                        </div>
                      )}
                      {order.driver && (
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>{tLocal.deliveryDriver}</p>
                          <p style={{ fontWeight: 600, margin: '2px 0 0 0' }}>{order.driver.name}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '2px 0 0 0' }}>📞 {order.driver.phone}</p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* Delivery Location Column */}
                  {(() => {
                    const loc = getCurrentLocationDetails();
                    if (!loc) return null;
                    return (
                      <div>
                        <h4 style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>
                          📍 {lang === 'km' ? 'ទីតាំងកញ្ចប់អីវ៉ាន់' : 'Delivery Location'}
                        </h4>
                        <div style={{ marginBottom: 12 }}>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
                            {lang === 'km' ? 'អ្នកទទួលបន្ទុកបច្ចុប្បន្ន' : 'Current Custodian'}
                          </p>
                          <p style={{ fontWeight: 600, margin: '2px 0 0 0' }}>{loc.custodian}</p>
                        </div>
                        <div>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', margin: 0 }}>
                            {lang === 'km' ? 'ទីតាំងបច្ចុប្បន្ន' : 'Current Location'}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>{loc.location}</p>
                          {loc.driverPhone && (
                            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '4px 0 0 0' }}>📞 {loc.driverPhone}</p>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Unified Timeline tracking */}
              <div className="card" style={{ padding: 24 }}>
                <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>
                  📍 {lang === 'km' ? 'ប្រវត្តិធ្វើដំណើរ និងស្ថានភាពកញ្ចប់អីវ៉ាន់' : 'Package Status & Timeline History'}
                </h4>
                {renderTimeline(timelineSteps)}
              </div>

              {/* Detailed Status History Log */}
              {order.histories && order.histories.length > 0 && (
                <div className="card" style={{ padding: 24 }}>
                  <h4 style={{ fontWeight: 700, fontSize: 14, marginBottom: 20 }}>📋 {tLocal.detailedHistory}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, paddingLeft: 8 }}>
                    {[...order.histories]
                      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((h: any, idx: number) => {
                        const isLast = idx === order.histories.length - 1;
                        let pointColor = '#cbd5e1';
                        if (h.status === 'delivered') pointColor = '#10b981';
                        else if (h.status === 'failed') pointColor = '#ef4444';
                        else if (h.status === 'returned') pointColor = '#6b7280';
                        else if (['in-transit', 'picked-up', 'assigned'].includes(h.status)) pointColor = '#f59e0b';
                        else if (h.status === 'in-warehouse') pointColor = '#10b981';
                        else pointColor = '#3b82f6';
                        
                        return (
                          <div key={h.id} style={{ display: 'flex', gap: 16, position: 'relative' }}>
                            {/* Vertical Line */}
                            {!isLast && (
                              <div style={{
                                position: 'absolute',
                                left: 7,
                                top: 20,
                                bottom: -20,
                                width: '2px',
                                background: '#e2e8f0',
                                zIndex: 1
                              }} />
                            )}
                            
                            {/* Bullet Point */}
                            <div style={{
                              width: 16,
                              height: 16,
                              borderRadius: '50%',
                              backgroundColor: '#fff',
                              border: `3px solid ${pointColor}`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              zIndex: 2,
                              marginTop: 4
                            }} />

                            {/* Content Block */}
                            <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <Badge status={h.status} label={getStatusLabel(h.status)} />
                                </div>
                                <div style={{ color: 'var(--text-muted)', fontSize: 11.5, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <MdAccessTime size={13.5} style={{ color: '#94a3b8' }} />
                                  <span>{new Date(h.createdAt).toLocaleString(lang === 'km' ? 'kh-KH' : 'en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: true,
                                  })}</span>
                                </div>
                              </div>

                              {/* Note / Remarks */}
                              {h.note && (
                                <div style={{ 
                                  marginTop: 8, 
                                  padding: '8px 12px', 
                                  background: h.status === 'failed' || h.status === 'returned' ? '#fef2f2' : '#f8fafc',
                                  borderLeft: `3px solid ${h.status === 'failed' || h.status === 'returned' ? '#ef4444' : '#cbd5e1'}`,
                                  borderRadius: '0 6px 6px 0', 
                                  fontSize: 12.5, 
                                  color: '#334155',
                                  fontWeight: 500,
                                  maxWidth: '90%'
                                }}>
                                  📝 {lang === 'km' ? 'សម្គាល់៖' : 'Remark:'} {h.note}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
