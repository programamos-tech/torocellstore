'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  Users, 
  CreditCard, 
  AlertTriangle,
  Target,
  ShoppingCart
} from 'lucide-react'

interface StatisticsCardsProps {
  stats: {
    totalSales: number
    totalProfit: number
    activeProducts: number
    activeClients: number
    pendingPayments: number
    profitMargin: number
    lowStockProducts: number
    salesThisMonth: number
  }
  previousStats?: {
    totalSales: number
    totalProfit: number
    activeProducts: number
    activeClients: number
    pendingPayments: number
    profitMargin: number
    lowStockProducts: number
    salesThisMonth: number
  }
}

export function StatisticsCards({ stats, previousStats }: StatisticsCardsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const calculateChange = (current: number, previous: number, isPercentage: boolean = false) => {
    if (!previousStats || previous === 0) {
      return { change: 'N/A', changeType: 'neutral' as const }
    }
    
    const change = ((current - previous) / previous) * 100
    const changeType = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral'
    
    if (isPercentage) {
      return {
        change: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`,
        changeType
      }
    } else {
      const absoluteChange = current - previous
      return {
        change: `${absoluteChange > 0 ? '+' : ''}${absoluteChange}`,
        changeType
      }
    }
  }

  const salesChange = calculateChange(stats.totalSales, previousStats?.totalSales || 0, true)
  const profitChange = calculateChange(stats.totalProfit, previousStats?.totalProfit || 0, true)
  const productsChange = calculateChange(stats.activeProducts, previousStats?.activeProducts || 0, false)
  const clientsChange = calculateChange(stats.activeClients, previousStats?.activeClients || 0, false)
  const marginChange = calculateChange(stats.profitMargin, previousStats?.profitMargin || 0, true)
  const paymentsChange = calculateChange(stats.pendingPayments, previousStats?.pendingPayments || 0, false)
  const stockChange = calculateChange(stats.lowStockProducts, previousStats?.lowStockProducts || 0, false)
  const monthlySalesChange = calculateChange(stats.salesThisMonth, previousStats?.salesThisMonth || 0, false)

  const cards = [
    {
      title: 'Ventas Totales',
      value: formatCurrency(stats.totalSales),
      change: salesChange.change,
      changeType: salesChange.changeType,
      icon: DollarSign,
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Ganancia Total',
      value: formatCurrency(stats.totalProfit),
      change: profitChange.change,
      changeType: profitChange.changeType,
      icon: TrendingUp,
      bgColor: 'bg-amber-100 dark:bg-amber-950/50',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      title: 'Productos Activos',
      value: stats.activeProducts.toString(),
      change: productsChange.change,
      changeType: productsChange.changeType,
      icon: Package,
      bgColor: 'bg-sky-100 dark:bg-sky-950/50',
      iconColor: 'text-sky-600 dark:text-sky-400'
    },
    {
      title: 'Clientes Activos',
      value: stats.activeClients.toString(),
      change: clientsChange.change,
      changeType: clientsChange.changeType,
      icon: Users,
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    {
      title: 'Margen de Ganancia',
      value: `${stats.profitMargin}%`,
      change: marginChange.change,
      changeType: marginChange.changeType,
      icon: Target,
      bgColor: 'bg-amber-100 dark:bg-amber-950/50',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      title: 'Pagos Pendientes',
      value: formatCurrency(stats.pendingPayments),
      change: paymentsChange.change,
      changeType: paymentsChange.changeType,
      icon: CreditCard,
      bgColor: 'bg-red-100 dark:bg-red-950/50',
      iconColor: 'text-red-600 dark:text-red-400'
    },
    {
      title: 'Stock Bajo',
      value: stats.lowStockProducts.toString(),
      change: stats.lowStockProducts > 0 ? 'Requiere atención' : stockChange.change,
      changeType: stats.lowStockProducts > 0 ? 'warning' as const : stockChange.changeType,
      icon: AlertTriangle,
      bgColor: 'bg-amber-100 dark:bg-amber-950/50',
      iconColor: 'text-amber-600 dark:text-amber-400'
    },
    {
      title: 'Ventas Este Mes',
      value: stats.salesThisMonth.toString(),
      change: `${monthlySalesChange.change} transacciones`,
      changeType: monthlySalesChange.changeType,
      icon: ShoppingCart,
      bgColor: 'bg-emerald-100 dark:bg-emerald-950/50',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    }
  ]

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'positive':
        return 'text-emerald-600 dark:text-emerald-400'
      case 'negative':
        return 'text-red-600 dark:text-red-400'
      case 'warning':
        return 'text-amber-600 dark:text-amber-400'
      default:
        return 'text-gray-600 dark:text-gray-400'
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon
        return (
          <Card key={index} className="border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    {card.value}
                  </p>
                  <p className={`text-sm font-medium ${getChangeColor(card.changeType)}`}>
                    {card.change}
                  </p>
                </div>
                <div className={`h-12 w-12 ${card.bgColor} rounded-full flex items-center justify-center`}>
                  <Icon className={`h-6 w-6 ${card.iconColor}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
