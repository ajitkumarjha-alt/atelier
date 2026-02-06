import express from 'express';

const createSiteAreasRouter = ({
  query,
  siteAreaCreateValidators,
  siteAreaUpdateValidators,
  handleValidationErrors
}) => {
  const router = express.Router();

  router.get('/projects/:id/site-areas', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query(
        'SELECT * FROM site_areas WHERE project_id = $1 ORDER BY area_type, name',
        [id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching site areas:', error);
      res.status(500).json({ error: 'Failed to fetch site areas' });
    }
  });

  router.get('/site-areas/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query('SELECT * FROM site_areas WHERE id = $1', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Site area not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error fetching site area:', error);
      res.status(500).json({ error: 'Failed to fetch site area' });
    }
  });

  router.post(
    '/projects/:projectId/site-areas',
    siteAreaCreateValidators,
    handleValidationErrors,
    async (req, res) => {
      const { projectId } = req.params;
      const {
        area_type,
        name,
        description,
        area_sqm,
        water_volume_cum,
        softscape_area_sqm,
        requires_water,
        water_connection_points,
        estimated_water_demand,
        requires_electrical,
        electrical_load_kw,
        lighting_points,
        power_points,
        has_ev_charging,
        ev_charging_points,
        requires_drainage,
        drainage_type,
        requires_hvac,
        hvac_capacity_tr,
        requires_fire_fighting,
        fire_hydrant_points,
        sprinkler_required,
        irrigation_type,
        landscape_category,
        amenity_type,
        capacity_persons,
        operational_hours,
        parking_type,
        car_spaces,
        bike_spaces,
        infrastructure_type,
        equipment_details,
        capacity_rating,
        location_description,
        notes
      } = req.body;

      try {
        if (
          area_type === 'landscape' &&
          softscape_area_sqm !== null &&
          softscape_area_sqm !== undefined &&
          area_sqm !== null &&
          area_sqm !== undefined &&
          Number(softscape_area_sqm) > Number(area_sqm)
        ) {
          return res.status(400).json({
            error: 'Softscape area cannot exceed total landscape area.'
          });
        }

        const result = await query(
          `INSERT INTO site_areas (
            project_id, area_type, name, description, area_sqm,
            water_volume_cum,
            softscape_area_sqm,
            requires_water, water_connection_points, estimated_water_demand,
            requires_electrical, electrical_load_kw, lighting_points, power_points,
            has_ev_charging, ev_charging_points,
            requires_drainage, drainage_type,
            requires_hvac, hvac_capacity_tr,
            requires_fire_fighting, fire_hydrant_points, sprinkler_required,
            irrigation_type, landscape_category,
            amenity_type, capacity_persons, operational_hours,
            parking_type, car_spaces, bike_spaces,
            infrastructure_type, equipment_details, capacity_rating,
            location_description, notes
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36
          ) RETURNING *`,
          [
            projectId, area_type, name, description, area_sqm,
            water_volume_cum,
            softscape_area_sqm,
            requires_water, water_connection_points, estimated_water_demand,
            requires_electrical, electrical_load_kw, lighting_points, power_points,
            has_ev_charging, ev_charging_points,
            requires_drainage, drainage_type,
            requires_hvac, hvac_capacity_tr,
            requires_fire_fighting, fire_hydrant_points, sprinkler_required,
            irrigation_type, landscape_category,
            amenity_type, capacity_persons, operational_hours,
            parking_type, car_spaces, bike_spaces,
            infrastructure_type, equipment_details, capacity_rating,
            location_description, notes
          ]
        );

        res.status(201).json(result.rows[0]);
      } catch (error) {
        console.error('Error creating site area:', error);
        res.status(500).json({ error: 'Failed to create site area' });
      }
    }
  );

  router.put(
    '/site-areas/:id',
    siteAreaUpdateValidators,
    handleValidationErrors,
    async (req, res) => {
      const { id } = req.params;
      const {
        area_type,
        name,
        description,
        area_sqm,
        water_volume_cum,
        softscape_area_sqm,
        requires_water,
        water_connection_points,
        estimated_water_demand,
        requires_electrical,
        electrical_load_kw,
        lighting_points,
        power_points,
        has_ev_charging,
        ev_charging_points,
        requires_drainage,
        drainage_type,
        requires_hvac,
        hvac_capacity_tr,
        requires_fire_fighting,
        fire_hydrant_points,
        sprinkler_required,
        irrigation_type,
        landscape_category,
        amenity_type,
        capacity_persons,
        operational_hours,
        parking_type,
        car_spaces,
        bike_spaces,
        infrastructure_type,
        equipment_details,
        capacity_rating,
        location_description,
        notes
      } = req.body;

      try {
        if (
          area_type === 'landscape' &&
          softscape_area_sqm !== null &&
          softscape_area_sqm !== undefined &&
          area_sqm !== null &&
          area_sqm !== undefined &&
          Number(softscape_area_sqm) > Number(area_sqm)
        ) {
          return res.status(400).json({
            error: 'Softscape area cannot exceed total landscape area.'
          });
        }

        const result = await query(
          `UPDATE site_areas SET
            area_type = $1, name = $2, description = $3, area_sqm = $4,
            water_volume_cum = $5,
            softscape_area_sqm = $6,
            requires_water = $7, water_connection_points = $8, estimated_water_demand = $9,
            requires_electrical = $10, electrical_load_kw = $11, lighting_points = $12,
            power_points = $13, has_ev_charging = $14, ev_charging_points = $15,
            requires_drainage = $16, drainage_type = $17,
            requires_hvac = $18, hvac_capacity_tr = $19,
            requires_fire_fighting = $20, fire_hydrant_points = $21, sprinkler_required = $22,
            irrigation_type = $23, landscape_category = $24,
            amenity_type = $25, capacity_persons = $26, operational_hours = $27,
            parking_type = $28, car_spaces = $29, bike_spaces = $30,
            infrastructure_type = $31, equipment_details = $32, capacity_rating = $33,
            location_description = $34, notes = $35,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $36
          RETURNING *`,
          [
            area_type, name, description, area_sqm,
            water_volume_cum,
            softscape_area_sqm,
            requires_water, water_connection_points, estimated_water_demand,
            requires_electrical, electrical_load_kw, lighting_points, power_points,
            has_ev_charging, ev_charging_points,
            requires_drainage, drainage_type,
            requires_hvac, hvac_capacity_tr,
            requires_fire_fighting, fire_hydrant_points, sprinkler_required,
            irrigation_type, landscape_category,
            amenity_type, capacity_persons, operational_hours,
            parking_type, car_spaces, bike_spaces,
            infrastructure_type, equipment_details, capacity_rating,
            location_description, notes,
            id
          ]
        );

        if (result.rows.length === 0) {
          return res.status(404).json({ error: 'Site area not found' });
        }

        res.json(result.rows[0]);
      } catch (error) {
        console.error('Error updating site area:', error);
        res.status(500).json({ error: 'Failed to update site area' });
      }
    }
  );

  router.get('/projects/:id/site-areas/summary', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query(
        `SELECT 
          area_type,
          COUNT(*) as count,
          SUM(area_sqm) as total_area_sqm,
          SUM(softscape_area_sqm) as total_softscape_area_sqm,
          SUM(CASE WHEN requires_water THEN estimated_water_demand ELSE 0 END) as total_water_demand,
          SUM(CASE WHEN requires_electrical THEN electrical_load_kw ELSE 0 END) as total_electrical_load,
          SUM(lighting_points) as total_lighting_points,
          SUM(power_points) as total_power_points,
          SUM(CASE WHEN has_ev_charging THEN ev_charging_points ELSE 0 END) as total_ev_charging_points
        FROM site_areas
        WHERE project_id = $1
        GROUP BY area_type`,
        [id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching site areas summary:', error);
      res.status(500).json({ error: 'Failed to fetch site areas summary' });
    }
  });

  router.delete('/site-areas/:id', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query('DELETE FROM site_areas WHERE id = $1 RETURNING *', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Site area not found' });
      }

      res.json({ message: 'Site area deleted successfully', deletedArea: result.rows[0] });
    } catch (error) {
      console.error('Error deleting site area:', error);
      res.status(500).json({ error: 'Failed to delete site area' });
    }
  });

  router.get('/projects/:id/site-areas/summary', async (req, res) => {
    const { id } = req.params;

    try {
      const result = await query(
        `SELECT 
          area_type,
          COUNT(*) as count,
          SUM(area_sqm) as total_area_sqm,
          SUM(softscape_area_sqm) as total_softscape_area_sqm,
          SUM(CASE WHEN requires_water THEN estimated_water_demand ELSE 0 END) as total_water_demand,
          SUM(CASE WHEN requires_electrical THEN electrical_load_kw ELSE 0 END) as total_electrical_load,
          SUM(lighting_points) as total_lighting_points,
          SUM(power_points) as total_power_points,
          SUM(CASE WHEN has_ev_charging THEN ev_charging_points ELSE 0 END) as total_ev_charging_points
        FROM site_areas
        WHERE project_id = $1
        GROUP BY area_type`,
        [id]
      );
      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching site areas summary:', error);
      res.status(500).json({ error: 'Failed to fetch site areas summary' });
    }
  });

  return router;
};

export default createSiteAreasRouter;
