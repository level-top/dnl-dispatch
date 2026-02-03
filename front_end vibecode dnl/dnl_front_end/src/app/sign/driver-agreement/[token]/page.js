import SignDriverAgreementClient from "./SignDriverAgreementClient";

export default function SignDriverAgreementPage({ params }) {
  return <SignDriverAgreementClient token={params?.token} />;
}
