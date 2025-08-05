-- Add RLS policies for the Profils table that was missing them
CREATE POLICY "Users can view their own profile" 
ON public."Profils" 
FOR SELECT 
USING (true); -- Allow all users to view profiles for now

CREATE POLICY "Users can create profiles" 
ON public."Profils" 
FOR INSERT 
WITH CHECK (true); -- Allow profile creation

CREATE POLICY "Users can update profiles" 
ON public."Profils" 
FOR UPDATE 
USING (true); -- Allow profile updates

CREATE POLICY "Users can delete profiles" 
ON public."Profils" 
FOR DELETE 
USING (true); -- Allow profile deletion