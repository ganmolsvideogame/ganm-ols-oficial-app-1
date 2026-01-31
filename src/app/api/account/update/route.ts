import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function buildRedirect(
  request: Request,
  path: string,
  params?: Record<string, string>
) {
  const url = new URL(path, request.url);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  return NextResponse.redirect(url, { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const displayName = String(formData.get("display_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const addressLine1 = String(formData.get("address_line1") ?? "").trim();
  const addressLine2 = String(formData.get("address_line2") ?? "").trim();
  const district = String(formData.get("district") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const state = String(formData.get("state") ?? "").trim();
  const zipcode = String(formData.get("zipcode") ?? "").trim();
  const payoutMethodRaw = String(formData.get("payout_method") ?? "").trim();
  const payoutMethod =
    payoutMethodRaw === "pix" || payoutMethodRaw === "bank"
      ? payoutMethodRaw
      : null;
  const payoutPixKey = String(formData.get("payout_pix_key") ?? "").trim();
  const payoutBankName = String(formData.get("payout_bank_name") ?? "").trim();
  const payoutBankAgency = String(formData.get("payout_bank_agency") ?? "").trim();
  const payoutBankAccount = String(formData.get("payout_bank_account") ?? "").trim();
  const payoutBankAccountType = String(
    formData.get("payout_bank_account_type") ?? ""
  ).trim();
  const payoutDoc = String(formData.get("payout_doc") ?? "").trim();
  const payoutName = String(formData.get("payout_name") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const passwordConfirm = String(formData.get("password_confirm") ?? "").trim();

  const hasPassword = Boolean(password);
  const hasConfirm = Boolean(passwordConfirm);
  const shouldUpdatePassword = hasPassword && hasConfirm;

  if (displayName && !displayName.includes(" ")) {
    return buildRedirect(request, "/conta", {
      error: "Informe seu nome completo (nome e sobrenome).",
    });
  }

  if (shouldUpdatePassword && password.length < 6) {
    return buildRedirect(request, "/conta", {
      error: "Senha precisa ter pelo menos 6 caracteres",
    });
  }

  if (shouldUpdatePassword && password !== passwordConfirm) {
    return buildRedirect(request, "/conta", {
      error: "As senhas nao conferem",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return buildRedirect(request, "/entrar", {
      error: "Faca login para atualizar seus dados",
    });
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      display_name: displayName || null,
      phone: phone || null,
      address_line1: addressLine1 || null,
      address_line2: addressLine2 || null,
      district: district || null,
      city: city || null,
      state: state || null,
      zipcode: zipcode || null,
      payout_method: payoutMethod,
      payout_pix_key: payoutPixKey || null,
      payout_bank_name: payoutBankName || null,
      payout_bank_agency: payoutBankAgency || null,
      payout_bank_account: payoutBankAccount || null,
      payout_bank_account_type: payoutBankAccountType || null,
      payout_doc: payoutDoc || null,
      payout_name: payoutName || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (profileError) {
    return buildRedirect(request, "/conta", {
      error: profileError.message,
    });
  }

  if (displayName) {
    await supabase.auth.updateUser({
      data: { display_name: displayName },
    });
  }

  if (shouldUpdatePassword) {
    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      return buildRedirect(request, "/conta", {
        error: passwordError.message,
      });
    }
  }

  return buildRedirect(request, "/conta", {
    success: "Dados atualizados",
  });
}
