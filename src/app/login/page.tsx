import { signIn } from "@/auth"

export default async function LoginPage() {
  // Автоматически запускает флоу авторизации (совершая нужный POST-запрос под капотом)
  await signIn("authentik")
}
