import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // No te olvides de incluir los nuevos archivos aquí para que se cacheen
      includeAssets: ['favicon.ico', 'icon-192x192.png', 'icon-512x512.png', 'screenshot-mobile.png', 'screenshot-desktop.png'],
      manifest: {
        name: 'GeoClock Guardiola',
        short_name: 'GeoClock',
        description: 'Control de fichajes geolocalizado',
        theme_color: '#ff8c00', /* Ajustado al naranja de tu app */
        background_color: '#0f172a', /* Ajustado al fondo oscuro de tu app (slate-950) */
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '384x384', // <-- CAMBIA ESTO PARA QUE COINCIDA CON LA REALIDAD
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '1024x1024', // <-- CAMBIA ESTO PARA QUE COINCIDA CON LA REALIDAD
            type: 'image/png'
          }
        ],
        // AQUÍ ESTÁ LA MAGIA PARA LA INSTALACIÓN "PREMIUM" Y QUITAR AVISOS
        screenshots: [
          {
            src: '/screenshot-mobile.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow'
          },
          {
            src: '/screenshot-desktop.png',
            sizes: '1920x1080',
            type: 'image/png',
            form_factor: 'wide'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[a-z]+\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24
              }
            }
          }
        ]
      }
    })
  ]
})
