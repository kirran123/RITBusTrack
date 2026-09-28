-- ============================================================================
-- SUPABASE AUTH & PROFILES SYNC TRIGGERS
-- Automatically creates and updates public.profiles on auth.users changes
-- Ensures seamless authentication across Mobile App and Admin Web
-- ============================================================================

-- 1. Ensure 'staff' is present in user_role enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'staff' 
    AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'staff';
  END IF;
END $$;

-- 2. Trigger Function: Automatically create or link public.profiles when auth.users is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role user_role := 'student';
  raw_role text;
  display_name text;
BEGIN
  -- Extract role from user metadata
  raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'student'));
  IF raw_role IN ('admin', 'super_admin') THEN
    assigned_role := 'admin';
  ELSIF raw_role IN ('driver') THEN
    assigned_role := 'driver';
  ELSIF raw_role IN ('staff', 'faculty') THEN
    assigned_role := 'staff';
  ELSE
    assigned_role := 'student';
  END IF;

  -- Extract display name
  display_name := COALESCE(
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Upsert profile on auth signup
  INSERT INTO public.profiles (
    id,
    auth_user_id,
    name,
    email,
    phone,
    role,
    status,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.id,
    display_name,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone, ''),
    assigned_role,
    'active',
    NOW(),
    NOW()
  )
  ON CONFLICT (email) DO UPDATE SET
    auth_user_id = EXCLUDED.auth_user_id,
    name = COALESCE(NULLIF(EXCLUDED.name, ''), public.profiles.name),
    phone = COALESCE(NULLIF(EXCLUDED.phone, ''), public.profiles.phone),
    role = CASE 
      WHEN public.profiles.role = 'admin' THEN public.profiles.role 
      ELSE EXCLUDED.role 
    END,
    status = 'active',
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Attach Trigger on auth.users for new signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Trigger Function: Sync auth user updates (e.g. email change)
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET 
    email = NEW.email,
    updated_at = NOW()
  WHERE auth_user_id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Attach Trigger on auth.users for updates
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_update();

-- 6. Trigger Function: Auto-update updated_at timestamp on profile edit
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
