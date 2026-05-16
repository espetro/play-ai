import React from 'react'
import { createRootRoute, createRoute } from '@tanstack/react-router'
import Root from './pages/Root'
import Chat from './pages/Chat'
import Settings from './pages/Settings'

export const rootRoute = createRootRoute({ component: Root })

export const chatRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Chat,
})

export const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: Settings,
})

export const routeTree = rootRoute.addChildren([chatRoute, settingsRoute])
