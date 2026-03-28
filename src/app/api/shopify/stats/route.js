import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const days = parseInt(searchParams.get('days') || '30', 10);

    if (!projectId) {
      return NextResponse.json(
        { error: 'project_id is required' },
        { status: 400 }
      );
    }

    // Fetch token from database
    const supabase = createServiceClient();
    const { data: integration, error: dbError } = await supabase
      .from('integrations_oauth')
      .select('access_token, provider_account_id, provider_metadata')
      .eq('project_id', projectId)
      .eq('provider', 'shopify')
      .single();

    if (dbError || !integration) {
      return NextResponse.json(
        { error: 'Shopify not connected', connected: false },
        { status: 404 }
      );
    }

    const { access_token, provider_account_id: shop, provider_metadata } = integration;
    const apiVersion = '2024-01';
    const baseApiUrl = `https://${shop}/admin/api/${apiVersion}`;

    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString();

    // Fetch orders
    const ordersUrl = `${baseApiUrl}/orders.json?status=any&created_at_min=${sinceStr}&limit=250`;
    const ordersRes = await fetch(ordersUrl, {
      headers: { 'X-Shopify-Access-Token': access_token },
    });

    if (!ordersRes.ok) {
      const err = await ordersRes.json().catch(() => ({}));
      console.error('Shopify orders API error:', err);

      if (ordersRes.status === 401) {
        return NextResponse.json(
          { error: 'Token invalid', token_expired: true },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch Shopify orders' },
        { status: 502 }
      );
    }

    const ordersData = await ordersRes.json();
    const orders = ordersData.orders || [];

    // Calculate stats
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_price || '0'), 0);
    const aov = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top products by revenue
    const productMap = {};
    for (const order of orders) {
      for (const item of order.line_items || []) {
        const key = item.product_id || item.title;
        if (!productMap[key]) {
          productMap[key] = {
            id: item.product_id,
            title: item.title,
            quantity: 0,
            revenue: 0,
          };
        }
        productMap[key].quantity += item.quantity;
        productMap[key].revenue += parseFloat(item.price || '0') * item.quantity;
      }
    }

    const topProducts = Object.values(productMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Orders by day for trend
    const ordersByDay = {};
    for (const order of orders) {
      const day = order.created_at.split('T')[0];
      if (!ordersByDay[day]) {
        ordersByDay[day] = { date: day, orders: 0, revenue: 0 };
      }
      ordersByDay[day].orders += 1;
      ordersByDay[day].revenue += parseFloat(order.total_price || '0');
    }

    const dailyTrend = Object.values(ordersByDay).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      totals: {
        orders: totalOrders,
        revenue: totalRevenue.toFixed(2),
        aov: aov.toFixed(2),
        currency: provider_metadata?.currency || 'EUR',
      },
      topProducts,
      dailyTrend,
      period: {
        since: sinceStr.split('T')[0],
        until: new Date().toISOString().split('T')[0],
        days,
      },
      shop: {
        name: provider_metadata?.shop_name || shop,
        domain: provider_metadata?.shop_domain || shop,
      },
    });
  } catch (error) {
    console.error('Shopify stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
