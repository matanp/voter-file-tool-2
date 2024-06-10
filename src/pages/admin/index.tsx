import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const AdminPage: React.FC = () => {
  return (
    <div className="w-full">
      <h1 className="text-center">Admin Page</h1>
      <Input type="file" />
      <Button>helllllo world</Button>
      {/* Add your admin page content here */}
    </div>
  );
};

export default AdminPage;
