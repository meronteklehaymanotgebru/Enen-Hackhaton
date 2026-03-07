CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    birth_date DATE,
    age INT GENERATED ALWAYS AS (
        CASE
            WHEN birth_date IS NOT NULL THEN
                EXTRACT(YEAR FROM AGE(birth_date))
            ELSE NULL
        END
    ) STORED,
    is_premium BOOLEAN DEFAULT FALSE,
    notification_radius INT DEFAULT 500, -- in meters
    is_helper BOOLEAN DEFAULT FALSE, -- willing to help others
    is_police BOOLEAN DEFAULT FALSE, -- police role
    location GEOGRAPHY(POINT, 4326), -- current location for helpers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency contacts
CREATE TABLE emergency_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    relationship TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panic alerts
CREATE TABLE panic_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'accepted')),
    police_accepted_by UUID REFERENCES profiles(id), -- police who accepted
    accepted_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recordings (audio/video chunks)
CREATE TABLE recordings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    panic_id UUID REFERENCES panic_alerts(id) ON DELETE CASCADE,
    chunk_number INT NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage path
    file_type TEXT CHECK (file_type IN ('audio', 'video')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe Pass routes (premium feature)
CREATE TABLE safe_pass_routes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    start_loc GEOGRAPHY(POINT, 4326) NOT NULL,
    end_loc GEOGRAPHY(POINT, 4326) NOT NULL,
    risk_score FLOAT CHECK (risk_score >= 0 AND risk_score <= 1),
    ai_analysis JSONB, -- OpenAI analysis result
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_profiles_user_id ON profiles(id);
CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);
CREATE INDEX idx_panic_alerts_user_id ON panic_alerts(user_id);
CREATE INDEX idx_panic_alerts_location ON panic_alerts USING GIST(location);
CREATE INDEX idx_panic_alerts_status ON panic_alerts(status);
CREATE INDEX idx_recordings_panic_id ON recordings(panic_id);
CREATE INDEX idx_safe_pass_routes_user_id ON safe_pass_routes(user_id);
CREATE INDEX idx_safe_pass_routes_locations ON safe_pass_routes USING GIST(start_loc, end_loc);

-- Function to get nearby helpers
CREATE OR REPLACE FUNCTION get_nearby_helpers(user_lat float, user_lng float, radius_meters int)
RETURNS TABLE (
    id uuid,
    name text,
    distance_meters float
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        COALESCE(p.name, 'Anonymous Helper') as name,
        ST_Distance(
            ST_Point(user_lng, user_lat)::geography,
            p.location::geography
        ) as distance_meters
    FROM profiles p
    WHERE p.is_helper = true
    AND ST_DWithin(
        ST_Point(user_lng, user_lat)::geography,
        p.location::geography,
        radius_meters
    )
    ORDER BY distance_meters ASC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;