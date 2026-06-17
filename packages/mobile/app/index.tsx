/**
 * Ghaafeedi Music — Mobile App Entry
 * Admin launcher — redirects to /admin
 */
import { Redirect } from "expo-router";

export default function Index() {
  // Direct entry to admin control center
  return <Redirect href="/admin" />;
}
