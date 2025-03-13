import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testQueries() {
    console.log('Testing different query formats...\n')

    // Test 1: Simple join
    console.log('Test 1: Simple join')
    const { data: data1, error: error1 } = await supabase
        .from('conversations')
        .select(
            `
      contact_id,
      contacts (
        id,
        phone,
        full_name
      )
    `
        )
        .eq('status', 'active')
        .limit(2)

    console.log('Query 1 result:', JSON.stringify(data1, null, 2))
    if (error1) console.error('Query 1 error:', error1)
    console.log('\n-------------------\n')

    // Test 2: Using foreign key relationship
    console.log('Test 2: Using contact:contacts alias')
    const { data: data2, error: error2 } = await supabase
        .from('conversations')
        .select(
            `
      contact_id,
      contact:contacts (
        id,
        phone,
        full_name
      )
    `
        )
        .eq('status', 'active')
        .limit(2)

    console.log('Query 2 result:', JSON.stringify(data2, null, 2))
    if (error2) console.error('Query 2 error:', error2)
    console.log('\n-------------------\n')

    // Test 3: Get all fields
    console.log('Test 3: Get all fields')
    const { data: data3, error: error3 } = await supabase
        .from('conversations')
        .select('*, contacts(*)')
        .eq('status', 'active')
        .limit(2)

    console.log('Query 3 result:', JSON.stringify(data3, null, 2))
    if (error3) console.error('Query 3 error:', error3)
}

testQueries().catch(console.error)
