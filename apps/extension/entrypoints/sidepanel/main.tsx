import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider, createRouter, createHashHistory } from '@tanstack/react-router'
import { rootRoute, chatRoute, settingsRoute, routeTree } from './routes'
import './style.css'

const hashHistory = createHashHistory()
const router = createRouter({ routeTree, history: hashHistory })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <RouterProvider router={router} />
)
