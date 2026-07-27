import Link from 'next/link';

import { LoginPage } from '@/pages/login';

export default function Login() {
  return (
    <>
      <LoginPage />
      <div className="fixed inset-x-0 bottom-8 flex justify-center">
        <Link href="/board" className="rounded-12 bg-gray-900 px-4 py-2 text-body-04 text-gray-50">
          보드로
        </Link>
      </div>
    </>
  );
}
